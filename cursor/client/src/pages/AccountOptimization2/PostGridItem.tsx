import { Heart, MessageCircle, Image as ImageIcon, Film, LayoutGrid, Hash, Eye } from 'lucide-react'
import { PostItem } from './types'
import { useI18nStore } from '../../i18n'

interface PostGridItemProps {
  post: PostItem
  language: string
}

export default function PostGridItem({ post, language }: PostGridItemProps) {
  const { t } = useI18nStore()
  const formattedDate = new Date(post.post_time * 1000).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\. /g, '.').replace(/\.$/, '')

  const handleClick = () => {
    window.open(`https://www.instagram.com/p/${post.url}/`, '_blank', 'noopener,noreferrer')
  }

  // 상태 매핑
  const getExposureStatusText = (status: string) => {
    if (status === '확산 적합') return t('accountOpt2SpreadSuitableStatus')
    if (status === '확산 모호') return t('accountOpt2SpreadAmbiguousStatus')
    return t('accountOpt2SpreadUnsuitableStatus')
  }

  // 타입명 매핑
  const getTypeNameText = (typename: string) => {
    if (typename === '단일 사진') return t('accountOpt2PostTypeSinglePhoto')
    if (typename === '여러장') return t('accountOpt2PostTypeMultiple')
    if (typename === '릴스') return t('accountOpt2PostTypeReels')
    return typename
  }

  const typenameIcons: Record<string, JSX.Element> = {
    [t('accountOpt2PostTypeSinglePhoto')]: <ImageIcon className="h-4 w-4" />,
    [t('accountOpt2PostTypeMultiple')]: <LayoutGrid className="h-4 w-4" />,
    [t('accountOpt2PostTypeReels')]: <Film className="h-4 w-4" />
  }

  // 상단 배지 스타일 결정
  const getBadgeStyle = () => {
    const status = post.exposure_status
    if (status === '확산 적합' || status === t('accountOpt2SpreadSuitableStatus')) {
      return 'bg-blue-500 text-white'
    } else if (status === '확산 모호' || status === t('accountOpt2SpreadAmbiguousStatus')) {
      return 'bg-yellow-500 text-white'
    } else {
      return 'bg-red-500 text-white'
    }
  }

  // 해시태그 개수 계산
  const hashtagCount = post.hashtags?.length || 0
  
  const displayTypeName = getTypeNameText(post.typename)
  const displayStatus = getExposureStatusText(post.exposure_status)

  return (
    <div 
      onClick={handleClick}
      className="group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 print:shadow-none print:break-inside-avoid border-2 border-gray-200 dark:border-gray-700 print:rounded-lg print:border"
    >
      {/* 상단 배지 (높이 증가) */}
      <div className={`${getBadgeStyle()} py-3 px-4 text-center font-bold text-sm tracking-wide`}>
        {displayStatus}
      </div>

      {/* 썸네일 이미지 */}
      <div className="aspect-square relative bg-gray-100 dark:bg-gray-900">
        <img
          src={post.thumbnail_url}
          alt={post.contents.slice(0, 50)}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>

      {/* 하단 메타데이터 */}
      <div className="p-3 space-y-2">
        {/* 날짜와 타입 */}
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{t('accountOpt2DateLabel')}</span>
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            {typenameIcons[displayTypeName] || <ImageIcon className="h-4 w-4" />}
            <span className="text-xs font-medium">{displayTypeName}</span>
          </div>
        </div>

        {/* 성과 지표 아이콘 */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {/* 좋아요 */}
            <div className="flex items-center gap-1 text-pink-600 dark:text-pink-400">
              <Heart className="h-3.5 w-3.5 fill-current" />
              <span className="font-semibold">{post.like_count > 0 ? post.like_count.toLocaleString() : 0}</span>
            </div>
            
            {/* 댓글 */}
            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="font-semibold">{post.comment_count > 0 ? post.comment_count.toLocaleString() : 0}</span>
            </div>
            
            {/* 해시태그 */}
            <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
              <Hash className="h-3.5 w-3.5" />
              <span className="font-semibold">{hashtagCount}</span>
            </div>
          </div>

          {/* 조회수 (릴스인 경우) */}
          {post.is_video && post.video_view_count > 0 && (
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Eye className="h-3.5 w-3.5" />
              <span className="font-semibold">{post.video_view_count.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
