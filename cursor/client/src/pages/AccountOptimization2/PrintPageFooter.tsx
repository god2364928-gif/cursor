import { useI18nStore } from '../../i18n'
import { getLocalToday } from '../../utils/dateUtils'

interface PrintPageFooterProps {
  pageNumber: number
  totalPages: number
  analysisDate?: string
  accountId?: string
}

export default function PrintPageFooter({ 
  pageNumber, 
  totalPages, 
  analysisDate,
  accountId 
}: PrintPageFooterProps) {
  const { t } = useI18nStore()
  const currentDate = analysisDate || getLocalToday()
  const accountName = accountId || t('accountOpt2ProfilePosts')
  
  return (
    <div className="hidden print-page-footer print:flex mt-8 pt-4 border-t border-gray-300">
      <div className="flex items-center justify-between text-xs text-gray-600 w-full">
        <span className="font-medium">{accountName}{t('accountOpt2AccountReportSuffix')}{currentDate}</span>
        <span>{t('accountOpt2PageLabel')} {pageNumber}{t('accountOpt2PageOf')}{totalPages}</span>
      </div>
    </div>
  )
}
