; ===============================================================================
; LINE 자동 업로드 스크립트
; ===============================================================================
; 설명: F1 키로 LINE 대화를 자동으로 내보내고 서버에 업로드
; 요구사항: AutoHotkey v2.0+, Windows 10/11
; 작성일: 2024.11.17
; ===============================================================================

#Requires AutoHotkey v2.0
#SingleInstance Force

; ===============================================================================
; 사용자 설정
; ===============================================================================

; Railway 서버 주소
RAILWAY_URL := "https://your-railway-app.railway.app"  ; ← 실제 Railway URL로 변경

; 로그인 토큰 (웹에서 로그인 후 localStorage에서 복사)
AUTH_TOKEN := "your-jwt-token-here"  ; ← 실제 토큰으로 변경

; LINE 대화 저장 폴더
EXPORT_FOLDER := "C:\line_exports"

; LINE 창 설정
LINE_WINDOW := "ahk_exe LINE.exe"

; LINE 언어 (한국어: KR, 일본어: JP)
LINE_LANG := "KR"  ; 자동 감지도 가능

; 디버그 모드 (true: 각 단계별 메시지 표시)
DEBUG_MODE := false

; ===============================================================================
; 초기화
; ===============================================================================

; 저장 폴더 생성
if !DirExist(EXPORT_FOLDER) {
    DirCreate(EXPORT_FOLDER)
}

; ===============================================================================
; F1: LINE 대화 업로드 (카테고리 선택)
; ===============================================================================

F1:: {
    ; 카테고리 선택
    category := ShowCategorySelector()
    if (category = "") {
        return  ; 취소됨
    }
    
    ; LINE 대화 내보내기 실행
    exportFile := ExportLineChat()
    if (exportFile = "") {
        MsgBox "대화 내보내기에 실패했습니다.", "오류", "Icon!"
        return
    }
    
    ; 서버로 업로드
    UploadToServer(exportFile, category)
}

; ===============================================================================
; F2: 디버그 - 현재 마우스 위치 확인
; ===============================================================================

F2:: {
    MouseGetPos &x, &y
    MsgBox "현재 마우스 위치:`nX = " x "`nY = " y, "디버그"
}

; ===============================================================================
; F3: 디버그 - 활성 창 정보 확인
; ===============================================================================

F3:: {
    title := WinGetTitle("A")
    class := WinGetClass("A")
    exe := ""
    try {
        exe := WinGetProcessName("A")
    }
    MsgBox "활성 창 정보:`n제목: " title "`n클래스: " class "`nEXE: " exe, "디버그"
}

; ===============================================================================
; 카테고리 선택 GUI
; ===============================================================================

ShowCategorySelector() {
    selected := ""
    
    gui := Gui("+AlwaysOnTop", "LINE 대화 업로드")
    gui.SetFont("s10")
    
    gui.Add("Text", "w300", "어디로 업로드할까요?")
    gui.Add("Text", "w300 c888888", "(대화방을 열어둔 상태에서 F1을 눌러주세요)")
    
    gui.Add("Radio", "vCategory1 Group Checked", "영업 이력 (새 고객 등록)")
    gui.Add("Radio", "vCategory2", "리타겟팅 (기존 고객 히스토리 추가)")
    gui.Add("Radio", "vCategory3", "고객관리 (기존 고객 히스토리 추가)")
    
    btnOk := gui.Add("Button", "Default w100", "확인")
    btnOk.OnEvent("Click", (*) => (
        gui.Submit(),
        selected := gui["Category1"] ? "sales_history" 
                  : gui["Category2"] ? "retargeting" 
                  : "customer_mgmt",
        gui.Destroy()
    ))
    
    btnCancel := gui.Add("Button", "x+10 w100", "취소")
    btnCancel.OnEvent("Click", (*) => (
        selected := "",
        gui.Destroy()
    ))
    
    gui.Show()
    WinWaitClose(gui)
    
    return selected
}

; ===============================================================================
; LINE 대화 내보내기 자동화
; ===============================================================================

ExportLineChat() {
    if DEBUG_MODE {
        MsgBox "LINE 창을 활성화합니다...", "디버그", "T1"
    }
    
    ; 1. LINE 창 활성화
    if !WinExist(LINE_WINDOW) {
        MsgBox "LINE이 실행 중이지 않습니다.`n먼저 LINE을 실행하고 대화방을 열어주세요.", "오류", "Icon!"
        return ""
    }
    
    WinActivate LINE_WINDOW
    if !WinWaitActive(LINE_WINDOW, , 3) {
        MsgBox "LINE 창을 활성화할 수 없습니다.", "오류", "Icon!"
        return ""
    }
    
    Sleep 300
    
    ; 2. 창 크기/위치 통일 (선택사항)
    ; WinMove 100, 100, 900, 700, LINE_WINDOW
    
    if DEBUG_MODE {
        MsgBox "메뉴 버튼을 찾습니다...", "디버그", "T1"
    }
    
    ; 3. 우측 상단 메뉴 버튼 (⋮) 클릭
    ; 상대 좌표로 계산
    WinGetPos &winX, &winY, &winWidth, &winHeight, "A"
    menuX := winX + winWidth - 80
    menuY := winY + 120
    
    Click menuX, menuY
    Sleep 500
    
    if DEBUG_MODE {
        MsgBox "메뉴에서 '대화 저장' 항목을 찾습니다...", "디버그", "T2"
    }
    
    ; 4. 키보드로 "대화 저장" 또는 "トークを保存" 찾기
    ; 언어별 Down 키 횟수
    downCount := (LINE_LANG = "KR") ? 8 : 4
    
    Loop downCount {
        Send "{Down}"
        Sleep 50
    }
    
    Send "{Enter}"
    Sleep 800
    
    if DEBUG_MODE {
        MsgBox "저장 대화상자를 기다립니다...", "디버그", "T1"
    }
    
    ; 5. 저장 대화상자 대기
    ; "다른 이름으로 저장" 또는 "名前を付けて保存"
    saved := false
    Loop 10 {
        if WinExist("다른 이름으로 저장") or WinExist("名前を付けて保存") or WinExist("Save As") {
            saved := true
            break
        }
        Sleep 300
    }
    
    if !saved {
        MsgBox "저장 대화상자를 찾을 수 없습니다.`n수동으로 대화 내보내기를 시도해보세요.", "오류", "Icon!"
        return ""
    }
    
    Sleep 300
    
    ; 6. 파일명 생성 (타임스탬프)
    timestamp := FormatTime(, "yyyyMMdd_HHmmss")
    fileName := "line_" timestamp ".txt"
    
    if DEBUG_MODE {
        MsgBox "파일명: " fileName "`n저장 위치: " EXPORT_FOLDER, "디버그", "T2"
    }
    
    ; 7. 경로 입력
    Send "^l"  ; 주소창 포커스
    Sleep 200
    Send EXPORT_FOLDER
    Send "{Enter}"
    Sleep 400
    
    ; 8. 파일명 입력
    Send fileName
    Sleep 200
    Send "{Enter}"
    
    ; 9. 파일 저장 대기
    Sleep 1500
    
    fullPath := EXPORT_FOLDER "\" fileName
    
    ; 파일 생성 확인
    Loop 10 {
        if FileExist(fullPath) {
            if DEBUG_MODE {
                MsgBox "파일 저장 완료!`n" fullPath, "성공", "T2"
            }
            return fullPath
        }
        Sleep 500
    }
    
    MsgBox "파일이 저장되지 않았습니다.`n경로: " fullPath, "오류", "Icon!"
    return ""
}

; ===============================================================================
; 서버로 업로드
; ===============================================================================

UploadToServer(filePath, category) {
    if DEBUG_MODE {
        MsgBox "서버로 업로드 중...`nURL: " RAILWAY_URL "/api/line-upload`n카테고리: " category, "디버그", "T2"
    }
    
    ; PowerShell로 multipart/form-data POST
    psScript := '
    $filePath = "' filePath '"
    $category = "' category '"
    $uri = "' RAILWAY_URL '/api/line-upload"
    $token = "' AUTH_TOKEN '"
    
    $form = @{
        file = Get-Item $filePath
        category = $category
    }
    
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    try {
        $response = Invoke-RestMethod -Uri $uri -Method Post -Form $form -Headers $headers
        Write-Output "SUCCESS|$($response.companyName)|$($response.customerName)|$($response.messagesCount)"
    } catch {
        $errorMsg = $_.Exception.Message
        if ($_.ErrorDetails.Message) {
            $errorMsg = $_.ErrorDetails.Message
        }
        Write-Output "ERROR|$errorMsg"
    }
    '
    
    ; PowerShell 실행
    result := ""
    try {
        shell := ComObject("WScript.Shell")
        exec := shell.Exec('powershell -NoProfile -Command "' psScript '"')
        result := exec.StdOut.ReadAll()
    } catch as e {
        MsgBox "PowerShell 실행 오류:`n" e.Message, "오류", "Icon!"
        return
    }
    
    ; 결과 파싱
    parts := StrSplit(result, "|")
    
    if (parts.Length > 0 && parts[1] = "SUCCESS") {
        companyName := parts.Length > 1 ? parts[2] : ""
        customerName := parts.Length > 2 ? parts[3] : ""
        msgCount := parts.Length > 3 ? parts[4] : ""
        
        MsgBox "✓ 업로드 완료!`n`n상호: " companyName "`n고객: " customerName "`n메시지: " msgCount "개", "성공", "Icon64"
    } else {
        errorMsg := parts.Length > 1 ? parts[2] : "알 수 없는 오류"
        MsgBox "✗ 업로드 실패`n`n" errorMsg, "오류", "Icon16"
    }
}

; ===============================================================================
; 설정 파일 저장/로드 (선택사항)
; ===============================================================================

; 설정을 line_config.ini에 저장하려면 주석 해제
/*
SaveConfig() {
    IniWrite RAILWAY_URL, "line_config.ini", "Settings", "RailwayURL"
    IniWrite AUTH_TOKEN, "line_config.ini", "Settings", "AuthToken"
    IniWrite LINE_LANG, "line_config.ini", "Settings", "Language"
}

LoadConfig() {
    global RAILWAY_URL, AUTH_TOKEN, LINE_LANG
    
    if FileExist("line_config.ini") {
        RAILWAY_URL := IniRead("line_config.ini", "Settings", "RailwayURL", RAILWAY_URL)
        AUTH_TOKEN := IniRead("line_config.ini", "Settings", "AuthToken", AUTH_TOKEN)
        LINE_LANG := IniRead("line_config.ini", "Settings", "Language", LINE_LANG)
    }
}

LoadConfig()
*/

; ===============================================================================
; 시작 메시지
; ===============================================================================

TrayTip "LINE 자동 업로드 스크립트 실행 중", "F1: 대화 업로드`nF2: 마우스 위치`nF3: 창 정보", 5

