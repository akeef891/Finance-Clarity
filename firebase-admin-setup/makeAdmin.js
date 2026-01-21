const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function makeAdmin() {
  const user = await admin.auth().getUserByEmail("mdakeef196905@gmail.com");
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  console.log("Admin claim added successfully");
}

makeAdmin();
