// Creates the public statistics bucket (R2_PUBLIC_BUCKET, default `teamupp-stats`) when it does not exist.
// The private state bucket (R2_BUCKET) keeps player ids and is never made public.
import { AwsClient } from 'aws4fetch';

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
const bucket = process.env.R2_PUBLIC_BUCKET || 'teamupp-stats';
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) throw new Error('R2 credentials missing');
const aws = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto' });
const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucket}`;
const head = await aws.fetch(url, { method: 'HEAD' });
console.log(`HEAD ${bucket}: ${head.status}`);
if (head.status === 404) {
  const res = await aws.fetch(url, { method: 'PUT' });
  console.log(`Create ${bucket}: ${res.status} ${res.ok ? 'created' : (await res.text()).slice(0, 300)}`);
}
const probe = await aws.fetch(`${url}/probe.txt`, { method: 'PUT', body: 'ok', headers: { 'Content-Type': 'text/plain' } });
console.log(`Write probe: ${probe.status}`);
