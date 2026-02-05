// API 응답 타입 정의

export interface Grades {
  post: string
  upload: string
  hashtag: string
  overall: string
  activity: string
  follower: string
  overall_score: number
}

export interface PostItem {
  url: string
  contents: string
  hashtags: string[]
  is_video: boolean
  typename: string
  is_pinned: boolean
  post_time: number
  like_count: number
  product_type: string
  comment_count: number
  thumbnail_url: string
  exposure_status: string
  video_view_count: number
  typename_original: string
}

export interface Progress {
  gap: number
  metric: string
  metric_text: string
  target_value: number
  current_value: number
  progress_percent: number
}

export interface Recommendation {
  title: string
  description: string
}

export interface CurrentStatus {
  unit: string
  value: number
  text?: string
  has_history?: boolean
}

export interface ExposureStats {
  suitable_count: number
  unsuitable_count: number
}

export interface CategoryData {
  desc: string
  grade: string
  title: string
  action: {
    recommendations: Recommendation[]
  }
  insight: string
  know_how: string
  progress: Progress | null
  icon_type: string
  current_status: CurrentStatus
  exposure_stats?: ExposureStats
}

export interface ContentExposureStats {
  suitable_count: number
  ambiguous_count: number
  unsuitable_count: number
}

export interface ApiResponse {
  status: string
  result: {
    grades: Grades
    username: string
    biography: string
    full_name: string
    post_list: PostItem[]
    post_type: string
    grade_text: string
    photo_rate: number
    post_count: number
    reels_rate: number
    total_grade: string
    follow_count: number
    grade_action: string
    carousel_rate: number
    category_data: CategoryData[]
    activity_grade: string
    follower_count: number
    follower_grade: string
    reaction_level: string
    reaction_status: string
    content_briefing: string
    post_count_grade: string
    analytics_message: string
    average_post_hour: number
    distribution_text: string
    profile_image_url: string
    average_like_count: number
    grade_action_class: string
    distribution_advice: string
    growthcore_customer: number
    recent_hashtag_list: Array<{
      count: number
      hashtag: string
    }>
    average_comment_count: number
    average_hashtag_count: number
    content_exposure_stats: ContentExposureStats
    average_video_view_count: number
    recent_30days_post_count: number
    recommend_service_message: string[]
  }
}

// 컴포넌트 Props 타입

export interface HeroScoreSectionProps {
  overallScore: number
  overallGrade: string
  gradeText: string
  gradeAction: string
  gradeActionClass: string
}

export interface CategoryCardProps {
  data: CategoryData
  language: string
}

export interface PostGridItemProps {
  post: PostItem
  language: string
}

export interface ProgressBarProps {
  progress: Progress
  grade: string
}

export interface ActionPlanCardProps {
  categoryData: CategoryData[]
  language: string
}

export interface PrintPageFooterProps {
  pageNumber: number
  totalPages: number
  analysisDate?: string
  accountId?: string
}
