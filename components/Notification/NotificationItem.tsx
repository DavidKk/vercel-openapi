'use client'

import { useEffect, useState } from 'react'
import { TbAlertCircle, TbCheck, TbCircleX, TbX } from 'react-icons/tb'

import { Spinner } from '@/components/Spinner'

import { type Notification, NotificationType } from './context/NotificationContext'

/**
 * Notification item component props
 */
interface NotificationItemProps {
  /** Notification data */
  notification: Notification
  /** Callback when notification is closed */
  onClose: () => void
}

/**
 * Get icon for notification type (aligned with project light theme and Tailwind palette)
 */
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case NotificationType.Success:
      return <TbCheck className="h-5 w-5 text-green-600" />
    case NotificationType.Warning:
      return <TbAlertCircle className="h-5 w-5 text-amber-600" />
    case NotificationType.Error:
      return <TbCircleX className="h-5 w-5 text-red-600" />
    case NotificationType.Loading:
      return <Spinner color="text-gray-500" />
    default:
      return null
  }
}

/**
 * Get left border color for notification type (Tailwind, matches project)
 */
function getNotificationBorderColor(type: NotificationType): string {
  switch (type) {
    case NotificationType.Success:
      return 'border-l-green-500'
    case NotificationType.Warning:
      return 'border-l-amber-500'
    case NotificationType.Error:
      return 'border-l-red-500'
    case NotificationType.Loading:
      return 'border-l-gray-400'
    default:
      return 'border-l-gray-300'
  }
}

/**
 * Notification item component
 * Individual notification with fade in/out animations
 */
export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  // Fade in on mount
  useEffect(() => {
    // Use requestAnimationFrame to ensure smooth animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true)
      })
    })
  }, [])

  /**
   * Handle close with fade out animation
   */
  const handleClose = () => {
    setIsRemoving(true)
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose()
    }, 300) // Match animation duration
  }

  const isLoading = notification.type === NotificationType.Loading
  const showProgressBar = isLoading && (notification.indeterminate !== false || notification.progress != null)
  const isIndeterminate = isLoading && (notification.indeterminate === true || notification.progress == null)

  return (
    <div
      className={`
        pointer-events-auto
        min-w-[280px] max-w-[420px]
        rounded-lg border border-gray-200 bg-white shadow-sm
        overflow-hidden
        transition-all duration-300 ease-out
        ${isVisible && !isRemoving ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
      `}
    >
      <div className={`flex items-start gap-3 border-l-4 bg-white p-4 ${getNotificationBorderColor(notification.type)}`}>
        <div className="mt-0.5 flex-shrink-0">{getNotificationIcon(notification.type)}</div>

        <div className="min-w-0 flex-1">
          {notification.title ? <div className="mb-1 text-sm font-semibold text-gray-900">{notification.title}</div> : null}
          <div className="text-sm leading-relaxed text-gray-700 break-words">{notification.message}</div>
          {showProgressBar ? (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              {isIndeterminate ? (
                <div className="h-full w-1/4 rounded-full bg-gray-400" style={{ animation: 'progress-indeterminate 1.2s ease-in-out infinite' }} />
              ) : (
                <div
                  className="h-full rounded-full bg-gray-500 transition-[width] duration-150 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, notification.progress ?? 0))}%` }}
                />
              )}
            </div>
          ) : null}
        </div>

        {!isLoading ? (
          <button
            type="button"
            onClick={handleClose}
            className="flex-shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close notification"
          >
            <TbX className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
