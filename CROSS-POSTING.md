# Cross-Posting Setup Guide

This guide explains how to set up cross-posting to Dev.to, Hashnode, and Medium.

## 1. Create Accounts

### Dev.to
1. Go to https://dev.to
2. Sign up with GitHub
3. Complete your profile

### Hashnode
1. Go to https://hashnode.com
2. Sign up with GitHub
3. Create a blog (you'll get a publication ID)

### Medium
1. Go to https://medium.com
2. Sign up
3. Complete your profile

## 2. Get API Keys

### Dev.to API Key
1. Go to https://dev.to/settings/extensions
2. Scroll to "DEV Community API Keys"
3. Generate a new key
4. Copy it

### Hashnode API Key
1. Go to https://hashnode.com/settings/developer
2. Generate a new token
3. Copy it
4. Also copy your Publication ID from your blog settings

### Medium Integration Token
1. Go to https://medium.com/me/settings
2. Scroll to "Integration tokens"
3. Generate a new token
4. Copy it

## 3. Set Environment Variables

### Local Development
Create a `.env` file:
```
DEVTO_API_KEY=your_devto_key
HASHNODE_API_KEY=your_hashnode_key
HASHNODE_PUBLICATION_ID=your_publication_id
MEDIUM_TOKEN=your_medium_token
```

### Vercel (for automated posting)
Go to your Vercel project → Settings → Environment Variables
Add all four variables.

## 4. Cross-Post a Blog

```bash
# Cross-post blog #3
node scripts/cross-post.mjs 3

# Cross-post blog #2
node scripts/cross-post.mjs 2
```

The script will:
- Post to all three platforms
- Set the canonical URL to your site (SEO benefit)
- Use your tags from the blog frontmatter
- Show the URLs of the published posts

## 5. Important Notes

- **Canonical URL**: All posts point back to icode4freedom.com as the original source
- **SEO**: Google will know your site is the original, avoiding duplicate content penalties
- **Tags**: Each platform has tag limits (Dev.to: 4, Hashnode: 5, Medium: 5)
- **Images**: May need to use absolute URLs for images to display correctly

## Troubleshooting

### "API key not set"
Make sure the environment variable is exported:
```bash
export DEVTO_API_KEY=your_key
node scripts/cross-post.mjs 3
```

### Post not appearing
- Dev.to: Check your dashboard, might be in drafts
- Hashnode: Check your publication dashboard
- Medium: Check your stories page

### Rate limits
- Dev.to: 10 articles per day
- Hashnode: No strict limit
- Medium: ~10 posts per day
