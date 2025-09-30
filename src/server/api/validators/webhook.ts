import { body } from 'express-validator'
import { WebhookEventType } from '../../interfaces/webhook'

const webhookEventTypes: WebhookEventType[] = [
  'post.published',
  'post.updated',
  'post.deleted',
  'post.draft_created',
  'post.draft_updated',
  'post.draft_deleted',
  'deployment.started',
  'deployment.completed',
  'deployment.failed',
  'site.settings_updated',
  'theme.changed',
  'tag.created',
  'tag.updated',
  'tag.deleted',
  'menu.updated',
  'system.error',
  'system.warning',
  'system.info',
]

export const validateWebhookCreate = [
  body('url')
    .isURL({ require_protocol: true, require_valid_protocol: true })
    .withMessage('URL must be a valid URL with protocol (http/https)')
    .isLength({ min: 1, max: 2048 })
    .withMessage('URL must be between 1 and 2048 characters'),

  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),

  body('events')
    .isArray({ min: 1 })
    .withMessage('Events must be an array with at least one event type')
    .custom((events) => {
      const invalidEvents = events.filter((event: string) => !webhookEventTypes.includes(event as WebhookEventType))
      if (invalidEvents.length > 0) {
        throw new Error(`Invalid event types: ${invalidEvents.join(', ')}`)
      }
      return true
    })
    .withMessage('Events must be valid webhook event types'),

  body('secret')
    .optional()
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('Secret must be between 1 and 255 characters'),

  body('headers')
    .optional()
    .isObject()
    .withMessage('Headers must be an object'),

  body('timeout')
    .optional()
    .isInt({ min: 1000, max: 300000 })
    .withMessage('Timeout must be between 1000 and 300000 milliseconds'),

  body('retryAttempts')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Retry attempts must be between 0 and 10'),

  body('retryDelay')
    .optional()
    .isInt({ min: 1000, max: 60000 })
    .withMessage('Retry delay must be between 1000 and 60000 milliseconds'),
]

export const validateWebhookUpdate = [
  body('url')
    .optional()
    .isURL({ require_protocol: true, require_valid_protocol: true })
    .withMessage('URL must be a valid URL with protocol (http/https)')
    .isLength({ min: 1, max: 2048 })
    .withMessage('URL must be between 1 and 2048 characters'),

  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),

  body('events')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Events must be an array with at least one event type')
    .custom((events) => {
      const invalidEvents = events.filter((event: string) => !webhookEventTypes.includes(event as WebhookEventType))
      if (invalidEvents.length > 0) {
        throw new Error(`Invalid event types: ${invalidEvents.join(', ')}`)
      }
      return true
    })
    .withMessage('Events must be valid webhook event types'),

  body('secret')
    .optional()
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('Secret must be between 1 and 255 characters'),

  body('headers')
    .optional()
    .isObject()
    .withMessage('Headers must be an object'),

  body('timeout')
    .optional()
    .isInt({ min: 1000, max: 300000 })
    .withMessage('Timeout must be between 1000 and 300000 milliseconds'),

  body('retryAttempts')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Retry attempts must be between 0 and 10'),

  body('retryDelay')
    .optional()
    .isInt({ min: 1000, max: 60000 })
    .withMessage('Retry delay must be between 1000 and 60000 milliseconds'),
]

export const validateEventSubscription = [
  body('eventType')
    .custom((value) => {
      return webhookEventTypes.includes(value) || Promise.reject(new Error(`Event type must be one of: ${webhookEventTypes.join(', ')}`))
    }),

  body('filter')
    .optional()
    .isObject()
    .withMessage('Filter must be an object'),

  body('filter.property')
    .if(body('filter').exists())
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Filter property must be between 1 and 100 characters'),

  body('filter.operator')
    .if(body('filter').exists())
    .custom((value) => {
      const validOperators = ['equals', 'contains', 'starts_with', 'ends_with', 'regex']
      return validOperators.includes(value) || Promise.reject(new Error('Filter operator must be one of: equals, contains, starts_with, ends_with, regex'))
    }),

  body('filter.value')
    .if(body('filter').exists())
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('Filter value must be between 1 and 255 characters'),
]
