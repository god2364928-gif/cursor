/**
 * 파일 이름을 디코딩합니다.
 * latin1에서 utf8로 변환을 시도하고, 실패하면 decodeURIComponent를 사용합니다.
 */
export const decodeFileName = (fileName: string): string => {
  try {
    const utf8Decoded = Buffer.from(fileName, 'latin1').toString('utf8')
    if (utf8Decoded !== fileName) {
      return utf8Decoded
    }
    return decodeURIComponent(fileName)
  } catch (e) {
    return fileName
  }
}




