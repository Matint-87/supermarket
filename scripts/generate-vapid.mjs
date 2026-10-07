// ساخت کلیدهای VAPID برای Web Push:  npm run generate-vapid
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log("این سه خط رو توی .env سرور بذار:\n");
console.log(`VAPID_PUBLIC_KEY="${publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${privateKey}"`);
console.log(`VAPID_SUBJECT="mailto:you@example.com"`);
