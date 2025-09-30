import { Router } from 'express'
import { body, param, query } from 'express-validator'
import { WebhookController } from '../controllers/webhook'
import { authenticateRequest } from '../middleware/auth'
import { validateWebhookCreate, validateWebhookUpdate, validateEventSubscription } from '../validators/webhook'

const router = Router()
const webhookController = new WebhookController()

// Apply authentication middleware to all routes
router.use(authenticateRequest)

/**
 * @swagger
 * /api/webhooks:
 *   post:
 *     summary: Create a new webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - events
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: The URL to send webhook requests to
 *               enabled:
 *                 type: boolean
 *                 default: true
 *                 description: Whether the webhook is enabled
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [post.published, post.updated, post.deleted, post.draft_created, post.draft_updated, post.draft_deleted, deployment.started, deployment.completed, deployment.failed, site.settings_updated, theme.changed, tag.created, tag.updated, tag.deleted, menu.updated, system.error, system.warning, system.info]
 *                 description: List of event types to subscribe to
 *               secret:
 *                 type: string
 *                 description: Optional secret for HMAC signature verification
 *               headers:
 *                 type: object
 *                 description: Additional headers to include in webhook requests
 *               timeout:
 *                 type: integer
 *                 minimum: 1000
 *                 maximum: 300000
 *                 default: 30000
 *                 description: Request timeout in milliseconds
 *               retryAttempts:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *                 default: 3
 *                 description: Maximum number of retry attempts
 *               retryDelay:
 *                 type: integer
 *                 minimum: 1000
 *                 maximum: 60000
 *                 default: 5000
 *                 description: Delay between retry attempts in milliseconds
 *     responses:
 *       201:
 *         description: Webhook created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/',
  validateWebhookCreate,
  webhookController.createWebhook,
)

/**
 * @swagger
 * /api/webhooks:
 *   get:
 *     summary: Get all webhooks
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: enabled
 *         schema:
 *           type: boolean
 *         description: Filter by enabled status
 *     responses:
 *       200:
 *         description: List of webhooks
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/',
  query('enabled').optional().isBoolean().withMessage('Enabled must be a boolean'),
  webhookController.getWebhooks,
)

/**
 * @swagger
 * /api/webhooks/{id}:
 *   get:
 *     summary: Get a specific webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook ID
 *     responses:
 *       200:
 *         description: Webhook details
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:id',
  param('id').isUUID().withMessage('Invalid webhook ID'),
  webhookController.getWebhook,
)

/**
 * @swagger
 * /api/webhooks/{id}:
 *   put:
 *     summary: Update a webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *               enabled:
 *                 type: boolean
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               secret:
 *                 type: string
 *               headers:
 *                 type: object
 *               timeout:
 *                 type: integer
 *               retryAttempts:
 *                 type: integer
 *               retryDelay:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Webhook updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put(
  '/:id',
  param('id').isUUID().withMessage('Invalid webhook ID'),
  validateWebhookUpdate,
  webhookController.updateWebhook,
)

/**
 * @swagger
 * /api/webhooks/{id}:
 *   delete:
 *     summary: Delete a webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook ID
 *     responses:
 *       200:
 *         description: Webhook deleted successfully
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/:id',
  param('id').isUUID().withMessage('Invalid webhook ID'),
  webhookController.deleteWebhook,
)

/**
 * @swagger
 * /api/webhooks/{id}/test:
 *   post:
 *     summary: Test a webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook ID
 *     responses:
 *       200:
 *         description: Test results
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:id/test',
  param('id').isUUID().withMessage('Invalid webhook ID'),
  webhookController.testWebhook,
)

/**
 * @swagger
 * /api/webhooks/{id}/enable:
 *   post:
 *     summary: Enable a webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook ID
 *     responses:
 *       200:
 *         description: Webhook enabled successfully
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:id/enable',
  param('id').isUUID().withMessage('Invalid webhook ID'),
  webhookController.enableWebhook,
)

/**
 * @swagger
 * /api/webhooks/{id}/disable:
 *   post:
 *     summary: Disable a webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook ID
 *     responses:
 *       200:
 *         description: Webhook disabled successfully
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:id/disable',
  param('id').isUUID().withMessage('Invalid webhook ID'),
  webhookController.disableWebhook,
)

/**
 * @swagger
 * /api/webhooks/{id}/subscriptions:
 *   post:
 *     summary: Subscribe to an event
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventType
 *             properties:
 *               eventType:
 *                 type: string
 *                 enum: [post.published, post.updated, post.deleted, post.draft_created, post.draft_updated, post.draft_deleted, deployment.started, deployment.completed, deployment.failed, site.settings_updated, theme.changed, tag.created, tag.updated, tag.deleted, menu.updated, system.error, system.warning, system.info]
 *               filter:
 *                 type: object
 *                 properties:
 *                   property:
 *                     type: string
 *                     description: Property path to filter on
 *                   operator:
 *                     type: string
 *                     enum: [equals, contains, starts_with, ends_with, regex]
 *                     description: Filter operator
 *                   value:
 *                     type: string
 *                     description: Filter value
 *     responses:
 *       201:
 *         description: Event subscription created successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:id/subscriptions',
  param('id').isUUID().withMessage('Invalid webhook ID'),
  validateEventSubscription,
  webhookController.subscribeToEvent,
)

/**
 * @swagger
 * /api/webhooks/{id}/subscriptions:
 *   get:
 *     summary: Get webhook subscriptions
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook ID
 *     responses:
 *       200:
 *         description: List of subscriptions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:id/subscriptions',
  param('id').isUUID().withMessage('Invalid webhook ID'),
  webhookController.getSubscriptions,
)

/**
 * @swagger
 * /api/webhooks/{id}/subscriptions/{subscriptionId}:
 *   delete:
 *     summary: Unsubscribe from an event
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook ID
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription ID
 *     responses:
 *       200:
 *         description: Event subscription cancelled successfully
 *       404:
 *         description: Subscription not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/:id/subscriptions/:subscriptionId',
  param('id').isUUID().withMessage('Invalid webhook ID'),
  param('subscriptionId').isUUID().withMessage('Invalid subscription ID'),
  webhookController.unsubscribeFromEvent,
)

/**
 * @swagger
 * /api/webhooks/{id}/deliveries:
 *   get:
 *     summary: Get webhook deliveries
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, delivered, failed, retrying]
 *         description: Filter by delivery status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of deliveries to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of deliveries to skip
 *     responses:
 *       200:
 *         description: List of deliveries
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:id/deliveries',
  param('id').isUUID().withMessage('Invalid webhook ID'),
  query('status').optional().custom((value) => {
    if (!value) return true
    const validStatuses = ['pending', 'delivered', 'failed', 'retrying']
    return validStatuses.includes(value) || Promise.reject(new Error('Invalid status'))
  }),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a positive integer'),
  webhookController.getDeliveries,
)

/**
 * @swagger
 * /api/webhooks/stats:
 *   get:
 *     summary: Get webhook statistics
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Webhook statistics
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/stats',
  webhookController.getStats,
)

export default router
