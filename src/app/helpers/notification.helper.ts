import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import User from '../modules/user/user.model';
import { config } from '../../config';

let isFirebaseInitialized = false;

if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
  try {
    initializeApp({
      credential: cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
    isFirebaseInitialized = true;
    console.log('[info]: Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error(`[error]: Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
} else {
  console.warn(
    `[warning]: Firebase service account credentials not found in env. Push notifications will run in Mock mode.`
  );
}

/**
 * Sends a push notification to all registered FCM devices of a recipient user.
 * Automatically handles stale/unregistered token pruning.
 */
export const sendPushNotification = async (
  recipientId: string,
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<void> => {
  if (!isFirebaseInitialized) {
    console.log(
      `[mock push notification to user ${recipientId}]: Title: "${payload.title}", Body: "${payload.body}", Data: ${JSON.stringify(
        payload.data || {}
      )}`
    );
    return;
  }

  try {
    const user = await User.findOne({ _id: recipientId, isDeleted: false });
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      return;
    }

    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'high_importance_channel',
          priority: 'high' as const,
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: 'default',
          },
        },
      },
      tokens: user.fcmTokens,
    };

    const response = await getMessaging().sendEachForMulticast(message);

    // Filter out invalid/expired registration tokens
    const tokensToRemove: string[] = [];
    response.responses.forEach((res: any, index: number) => {
      if (!res.success && res.error) {
        const errCode = res.error.code;
        if (
          errCode === 'messaging/invalid-registration-token' ||
          errCode === 'messaging/registration-token-not-registered'
        ) {
          tokensToRemove.push(user.fcmTokens![index]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      await User.updateOne(
        { _id: recipientId },
        { $pull: { fcmTokens: { $in: tokensToRemove } } } as any
      );
      console.log(`[info]: Pruned ${tokensToRemove.length} invalid FCM tokens for user ${recipientId}`);
    }
  } catch (error: any) {
    console.error(`[error]: Failed to send push notification: ${error.message}`);
  }
};

/**
 * Sends a high-priority FCM call data payload for background/terminated incoming calls.
 */
export const sendCallPushNotification = async (
  recipientId: string,
  payload: {
    callerName: string;
    callerAvatar?: string;
    isVideo: boolean;
    chatId?: string;
    callerId: string;
    offer: any;
  }
): Promise<void> => {
  if (!isFirebaseInitialized) {
    console.log(`[mock call push notification to user ${recipientId}]`, payload);
    return;
  }

  try {
    const user = await User.findOne({ _id: recipientId, isDeleted: false });
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      return;
    }

    const dataPayload: Record<string, string> = {
      type: 'call_offer',
      callerName: payload.callerName,
      callerAvatar: payload.callerAvatar || '',
      isVideo: String(payload.isVideo),
      chatId: payload.chatId || '',
      callerId: payload.callerId,
      offer: typeof payload.offer === 'string' ? payload.offer : JSON.stringify(payload.offer),
    };

    const message = {
      data: dataPayload,
      android: {
        priority: 'high' as const,
        ttl: 30000, // 30 seconds time-to-live for calls
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-expiration': String(Math.floor(Date.now() / 1000) + 30),
        },
        payload: {
          aps: {
            contentAvailable: true,
          },
        },
      },
      tokens: user.fcmTokens,
    };

    const response = await getMessaging().sendEachForMulticast(message);

    const tokensToRemove: string[] = [];
    response.responses.forEach((res: any, index: number) => {
      if (!res.success && res.error) {
        const errCode = res.error.code;
        if (
          errCode === 'messaging/invalid-registration-token' ||
          errCode === 'messaging/registration-token-not-registered'
        ) {
          tokensToRemove.push(user.fcmTokens![index]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      await User.updateOne(
        { _id: recipientId },
        { $pull: { fcmTokens: { $in: tokensToRemove } } } as any
      );
    }
  } catch (error: any) {
    console.error(`[error]: Failed to send call push notification: ${error.message}`);
  }
};
