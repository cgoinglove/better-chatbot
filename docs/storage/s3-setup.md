# S3 Storage Setup

This app supports S3 for file uploads (dev/prod). Development can rely on presigned PUTs directly from the browser, while production should keep the bucket private and serve via CDN (CloudFront + Origin Access Control) or signed GET URLs.

## Buckets
- Pick a region (e.g., `us-east-2`)
  - Dev/Test example: `better-chatbot-dev` (public GET on `uploads/` only if needed)
  - Prod example: `better-chatbot-prod` (private)
- Enable default encryption (SSE-S3) and versioning on both buckets.

## CORS
- Dev bucket: allow PUT/GET/HEAD from the origins you use locally and in staging, for example:
  - `http://localhost:3000`, `http://127.0.0.1:3000`
  - `https://staging.your-domain.com`, `http://staging.your-domain.com`
- Prod bucket: allow GET/HEAD only from your production domain (e.g., `https://app.your-domain.com`). Avoid enabling browser PUT in production.

## Dev public-read policy (prefix-only)
Grant public GET for the `uploads/` prefix on the dev bucket only if you need unauthenticated downloads:
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPublicReadForUploadsPrefix",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::better-chatbot-dev/uploads/*"
    }
  ]
}
```

## IAM (app runtime)
Least privilege for app role/user:
- Actions: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:HeadObject`
- Resources: `arn:aws:s3:::<bucket-name>/uploads/*`

## Env configuration
- Dev/local:
  - `FILE_STORAGE_TYPE=s3`
  - `FILE_STORAGE_PREFIX=uploads`
  - `FILE_STORAGE_S3_BUCKET=better-chatbot-dev`
  - `FILE_STORAGE_S3_REGION=us-east-2` (or set `AWS_REGION`)
  - Use AWS SSO/profile or `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`
- Prod:
  - `FILE_STORAGE_S3_BUCKET=better-chatbot-prod`
  - Prefer CloudFront; set `FILE_STORAGE_S3_PUBLIC_BASE_URL=https://<cdn-domain>`

## Verify locally
- Ensure `aws sso login --profile <your_profile>` (or credentials are already available).
- Test presign script:
```
AWS_PROFILE=<your_profile> \
FILE_STORAGE_TYPE=s3 \
FILE_STORAGE_S3_BUCKET=better-chatbot-dev \
FILE_STORAGE_S3_REGION=us-east-2 \
pnpm tsx scripts/verify-s3-upload-url.ts
```
- You should get `{ directUploadSupported: true, url, key, method: PUT }`.
- Upload with curl (optional): `curl -X PUT -H "Content-Type: image/png" --data-binary @file.png "<url>"`.
