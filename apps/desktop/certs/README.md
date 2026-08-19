# Windows code signing certificates

Public certificates only — no private key material lives here or anywhere else
in this repository. The signing key is an HSM-backed key in Google Cloud KMS and
is non-extractable by construction.

| File | Role |
| --- | --- |
| `keinsaas-codesigning.crt` | Leaf certificate, `CN=keinsaas OÜ` (`O=keinsaas OÜ`, `C=EE`). Passed to `signtool /f`. |
| `gogetssl-intermediate.crt` | Issuing CA, `GoGetSSL G4 CS RSA4096 SHA256 2022 CA-1`. Passed to `signtool /ac` so the chain travels inside the signature block. |
| `digicert-trusted-root-g4.crt` | `DigiCert Trusted Root G4`. Already in the Windows trust store; kept for reference and offline chain verification. |

## Facts worth keeping handy

- Leaf validity: **2026-08-05 → 2027-08-04**. Renew before that date; signatures
  produced earlier stay valid because every signature is RFC-3161 timestamped.
- Leaf key: **RSA 3072**, matching the KMS key algorithm
  `RSA_SIGN_PKCS1_3072_SHA256`.
- SHA-256 of the leaf's SubjectPublicKeyInfo (DER):
  `16681a689b8f8184342f1599c0ce5320b27d6e0bf5c97de8dc0ab556feb93eb5`

## Verifying the certificate still matches the HSM key

If signing starts failing with a key/certificate mismatch, confirm the pairing:

```bash
openssl x509 -in keinsaas-codesigning.crt -noout -pubkey \
  | openssl pkey -pubin -outform DER | openssl dgst -sha256

gcloud kms keys versions get-public-key 1 \
  --key=windows-code-signing --keyring=codesigning --location=de \
  --project=navigator-477411 --output-file=/tmp/kms.pub
openssl pkey -pubin -in /tmp/kms.pub -outform DER | openssl dgst -sha256
```

Both digests must be identical.

## Verifying the chain

```bash
openssl verify -CAfile digicert-trusted-root-g4.crt \
  -untrusted gogetssl-intermediate.crt keinsaas-codesigning.crt
```

## Renewal

A renewed certificate for the same KMS key only replaces
`keinsaas-codesigning.crt` — no workflow or key changes are needed, as long as
the public key digest above still matches. A rekey (new CSR against a new KMS
key version) additionally requires updating the `GCP_KMS_KEY_VERSION` secret.
