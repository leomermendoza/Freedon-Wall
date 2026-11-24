# Freedom Wall (GitHub Pages + Cloudflare Worker) — walang server na kailangan i-on

Website = GitHub Pages (libre, 24/7). Posting sa Facebook = Cloudflare Worker (libre, 24/7).
Hindi pwede sa GitHub Pages lang ang FB token (makikita ng lahat), kaya may Worker.

## 1. Facebook token
developers.facebook.com > Create App > Graph API Explorer > permissions:
pages_show_list, pages_manage_posts, pages_read_engagement > GET /me/accounts
> kunin ang Page `id` at `access_token`. I-extend muna sa long-lived user token bago /me/accounts
para NON-EXPIRING ang Page token.

## 2. Cloudflare Worker (dashboard lang, walang CLI)
1. dash.cloudflare.com > Workers & Pages > Create > Worker > i-paste ang laman ng worker/worker.js > Deploy.
2. Workers > KV > Create namespace "RATE". Sa Worker > Settings > Bindings > Add > KV: variable `RATE`.
3. Settings > Variables and Secrets:
   - Secret `FB_PAGE_ID`, Secret `FB_PAGE_TOKEN`, Secret `SALT` (kahit anong random text)
   - Text `ALLOWED_ORIGIN` = https://USERNAME.github.io
4. Kopyahin ang Worker URL (xxx.workers.dev).

## 3. GitHub Pages
1. Sa index.html, palitan ang `API_URL` ng Worker URL mo.
2. Gumawa ng repo, i-push ang index.html (huwag isama ang token — wala naman dito).
3. Repo > Settings > Pages > Deploy from branch > main / root.
4. Buksan ang https://USERNAME.github.io/REPO/
