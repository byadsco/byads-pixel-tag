# ByAds Pixel — Google Tag Manager template

<img src="assets/icon-96.png" alt="ByAds" width="48" height="48" align="right">

[![Validate template](https://github.com/byadsco/byads-pixel-tag/actions/workflows/validate.yml/badge.svg)](https://github.com/byadsco/byads-pixel-tag/actions/workflows/validate.yml)
[![Latest release](https://img.shields.io/github/v/release/byadsco/byads-pixel-tag)](https://github.com/byadsco/byads-pixel-tag/releases)
[![License](https://img.shields.io/github/license/byadsco/byads-pixel-tag)](LICENSE)

Tag template for Google Tag Manager web containers that loads the ByAds Pixel. The pixel measures page views,
conversions and ad-click attribution for the campaigns you run with ByAds.

- [How it works](#how-it-works)
- [Requirements](#requirements)
- [Installation](#installation)
- [Set up the tag](#set-up-the-tag)
- [Verify your installation](#verify-your-installation)
- [Fields](#fields)
- [Consent and privacy](#consent-and-privacy)
- [Permissions](#permissions)
- [Versions and updates](#versions-and-updates)
- [Support](#support)

## How it works

1. The first ByAds Pixel tag that fires on a page loads the pixel script from
   `https://pixel.byads.co/t/v1.js`, using your client ID.
2. Each tag passes its settings to the script: the event, the signals to collect, and any custom properties
   or user data.
3. The script collects the signals and sends the event to `https://pixel.byads.co/v1/beacon`.

The script loads once per page. Every tag that fires after that reuses it. The signal settings in your ByAds
profile, managed by ByAds, take precedence over the tag's signal checkboxes.

## Requirements

- A Google Tag Manager **web** container.
- A **ByAds client ID**. If you don't have one, ask your ByAds account manager.

## Installation

### From the Community Template Gallery

1. In your container, open **Templates**. Under **Tag Templates**, click **Search Gallery**.
2. Search for **ByAds Pixel** and click **Add to workspace**.
3. Review the permissions and click **Add**.

### Manual import

1. Download [`template.tpl`](template.tpl).
2. In **Templates**, under **Tag Templates**, click **New**, open the ⋮ menu and choose **Import**.
3. Select the file and click **Save**.

## Set up the tag

1. Go to **Tags → New** and choose **ByAds Pixel** as the tag type.
2. Enter your **Client ID**.
3. Choose the **Event type**. Use `Page view` for the base tag.
4. Add a trigger. For page views, use **All Pages**. For conversions, use the trigger of that action, such as a
   purchase confirmation.
5. Preview the container, check that the tag fires, and publish.

## Verify your installation

1. In GTM, click **Preview** and open your site. In Tag Assistant, the ByAds Pixel tag should appear under
   **Tags Fired**.
2. In your browser's developer tools, open the **Network** panel and check for:
   - `https://pixel.byads.co/t/v1.js?client=<your client ID>`, with status 200.
   - A request to `https://pixel.byads.co/v1/beacon` each time the tag fires.
3. To see what the tag sends, turn on **Debug mode** and open the browser console.

### Troubleshooting

| Symptom | What to check |
| --- | --- |
| The tag shows as **Failed** | The **Client ID** field is empty or comes from a variable that has no value. |
| `v1.js` is blocked | Your site's Content Security Policy must allow `https://pixel.byads.co` in `script-src`, `connect-src` and `img-src`. Ad blockers can also block it. |
| The tag doesn't fire | Check the trigger and, if you require consent, the tag's **Consent Settings**. |

## Fields

### Account

| Field | Description |
| --- | --- |
| Client ID | Your ByAds client ID. Required. |

### Event

| Field | Description | Default |
| --- | --- | --- |
| Event type | `page_view`, `purchase`, `add_to_cart`, `begin_checkout`, `view_item`, `view_item_list`, `add_payment_info`, `add_shipping_info`, `sign_up`, `login`, `generate_lead`, `search` or `custom`. | `page_view` |
| Custom event name | The event name when the event type is **Custom**. | — |
| Deduplication key | Optional. Events that share this key fire only once per page load. | — |

### Signals (advanced)

You can turn off each signal. If your ByAds profile defines signals, the profile settings take precedence.

| Signal | What it collects |
| --- | --- |
| Environment | URL, referrer, viewport, screen, device, language and time zone. |
| Performance timing | DNS, TTFB, DOM ready and page load times. |
| Consent state | Google consent mode states, such as `ad_storage` and `analytics_storage`. |
| Ad identifiers | Click IDs (`gclid`, `fbclid`, `ttclid`…), browser IDs (`_fbp`, `_ttp`…), analytics IDs (`_ga`…), campaign UTMs and affiliate IDs. |
| Data layer snapshot | A snapshot of the data layer. |
| Ecommerce auto-detection | Ecommerce objects pushed to the data layer. |

**Identifier filters** let you skip click IDs, browser IDs, analytics IDs, campaign UTMs or affiliate IDs.

### Custom properties

Key-value pairs sent with the event. Each value can be sent as is, in lowercase, or hashed with MD5, SHA-256 (hex)
or SHA-256 (Base64).

### User data

Email, phone, first name, last name, city, state or region, postal code and country. The **Normalization** setting
applies to all of them: none, lowercase, SHA-256 (hex) or SHA-256 (Base64).

### Advanced

| Field | Description | Default |
| --- | --- | --- |
| Data layer name | The name of your data layer, if it isn't `dataLayer`. | `dataLayer` |
| Debug mode | Logs beacons to the browser console. | Off |

## Consent and privacy

- The template doesn't wait for consent on its own. To require consent before the tag fires, open the tag's
  **Advanced Settings → Consent Settings** and add the consent types your policy needs, such as `ad_storage` and
  `analytics_storage`.
- If you send user data, you can hash it with SHA-256 before it leaves the browser by using the **Normalization**
  setting.
- You're responsible for informing your visitors about this measurement and for collecting consent where the law
  requires it.

## Permissions

| Permission | Why the template needs it |
| --- | --- |
| Injects scripts from `https://pixel.byads.co/t/*` | Loads the ByAds Pixel script. |
| Reads and writes `__advBeaconInbox`; reads `__advBeaconReady`; reads and runs `__advBeacon` | Passes each tag's settings to the script and reuses the script once it's loaded. |
| Logs to the console in debug mode | Shows diagnostic messages in Preview mode. |

## Versions and updates

The template follows [Semantic Versioning](https://semver.org/). [CHANGELOG.md](CHANGELOG.md) lists every
version, and each one is also a [GitHub release](https://github.com/byadsco/byads-pixel-tag/releases).

When a new version reaches the gallery, GTM shows an update notice in the **Templates** section of your
container. Updates are never applied automatically: review the changes, accept the update, then preview and
publish. New versions don't rename or remove fields unless the major version changes.

Maintainers: see [RELEASING.md](RELEASING.md).

## Repository contents

| Path | Purpose |
| --- | --- |
| [`template.tpl`](template.tpl) | The tag template, including its tests. |
| [`metadata.yaml`](metadata.yaml) | The versions published in the Community Template Gallery. |
| [`CHANGELOG.md`](CHANGELOG.md) | Changes in each version. |
| [`RELEASING.md`](RELEASING.md) | How to publish a new version. |
| [`scripts/validate.mjs`](scripts/validate.mjs) | Checks the template, its license and its versions; runs on every push and pull request (`npm run validate`). |
| [`assets/icon-96.png`](assets/icon-96.png) | The template icon. |

## Support

Open an issue in this repository or contact your ByAds account manager. To report a security problem, follow
[SECURITY.md](SECURITY.md).

## License

Apache 2.0. See [LICENSE](LICENSE).
