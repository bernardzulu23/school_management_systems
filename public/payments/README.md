# Mobile money provider logos

Place official **MTN**, **Airtel**, and **Zamtel** logo files here.

## Supported file names

Use the provider key as the filename:

| Provider      | Filename examples                                       |
| ------------- | ------------------------------------------------------- |
| MTN Zambia    | `mtn.png`, `mtn.jpg`, `mtn.jpeg`, `mtn.svg`             |
| Airtel Zambia | `airtel.png`, `airtel.jpg`, `airtel.jpeg`, `airtel.svg` |
| Zamtel        | `zamtel.png`, `zamtel.jpg`, `zamtel.jpeg`, `zamtel.svg` |

**Recommended:** PNG or JPEG with a transparent or white background, at least **128×128 px**.

The app prefers `.png` first, then falls back to `.svg` if PNG is missing.

## Optional: logo URLs in `.env`

Instead of local files, you can point to hosted images (must end in `.png`, `.jpg`, `.jpeg`, `.svg`, or `.webp`):

```env
NEXT_PUBLIC_PAYMENT_LOGO_MTN=https://yoursite.com/assets/mtn.png
NEXT_PUBLIC_PAYMENT_LOGO_AIRTEL=https://yoursite.com/assets/airtel.jpeg
NEXT_PUBLIC_PAYMENT_LOGO_ZAMTEL=https://yoursite.com/assets/zamtel.png
```

## Where logos appear

- `components/payments/ProviderLogos.js` — billing, onboarding, registration
- `components/payments/PaymentForm.js` — provider selection
- `app/onboarding/page.js` — school signup payment step

Configuration: `lib/payments/provider-logos.js`
