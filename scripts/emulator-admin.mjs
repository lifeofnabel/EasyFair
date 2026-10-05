// Local emulator helper only (project demo-jajehelp). Never touches the real Firebase project.
//   npm run emulator:admin -- codes                 -> show pending SMS codes
//   npm run emulator:admin -- grant +4915100000000  -> give that test user the admin claim
const BASE = 'http://127.0.0.1:9099';
const PROJECT = 'demo-jajehelp';
const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' };

const [cmd, arg] = process.argv.slice(2);

if (cmd === 'codes') {
  const res = await fetch(`${BASE}/emulator/v1/projects/${PROJECT}/verificationCodes`);
  console.log(JSON.stringify(await res.json(), null, 2));
} else if (cmd === 'grant' && arg) {
  const lookup = await fetch(`${BASE}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`, {
    method: 'POST', headers, body: JSON.stringify(arg.includes('@') ? { email: [arg] } : { phoneNumber: [arg] }),
  }).then((r) => r.json());
  const user = lookup.users?.[0];
  if (!user) throw new Error(`No emulator user ${arg}. Sign in once in the app first.`);
  await fetch(`${BASE}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: 'POST', headers, body: JSON.stringify({ localId: user.localId, customAttributes: JSON.stringify({ admin: true }) }),
  });
  console.log(`admin claim set for ${arg} (uid ${user.localId}). Sign in again in the app.`);
} else {
  console.log('Usage: npm run emulator:admin -- codes | grant <phone|email>');
}
