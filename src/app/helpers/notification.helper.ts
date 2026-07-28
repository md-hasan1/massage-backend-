import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import path from 'path';
import fs from 'fs';
import User from '../modules/user/user.model';

const serviceAccountPath = path.join(__dirname, '../../../config/firebase-service-account.json');

let isFirebaseInitialized = false;

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount),
    });
    isFirebaseInitialized = true;
    console.log('[info]: Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error(`[error]: Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
} else {
  console.warn(
    `[warning]: Firebase service account key not found at: ${serviceAccountPath}. Push notifications will run in Mock mode.`
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
