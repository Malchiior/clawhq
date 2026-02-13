# ClawHQ Domain Setup - clawhq.dev

## Current Status
- ✅ Domain purchased at Namecheap (devoniwits account)
- ✅ Domain added to Vercel project
- ✅ Project deployed: https://clawhq-alr2525xq-malchiiors-projects.vercel.app
- ⏳ DNS configuration needed at Namecheap

## DNS Records to Configure at Namecheap

### Step 1: Login to Namecheap
- Go to namecheap.com
- Login with devoniwits account (devoniwits@live.com)
- Navigate to Domain List → Manage clawhq.dev

### Step 2: Configure DNS Records
In the Advanced DNS tab, add these records:

```
Type    Host    Value                          TTL
A       @       76.76.21.21                   Automatic
CNAME   www     cname.vercel-dns.com          Automatic
```

### Step 3: Remove Existing Records
- Delete any existing A records pointing to 162.255.119.25 (parking page)
- Delete any conflicting CNAME records for www

### Alternative: Use Vercel Nameservers (Recommended)
Instead of individual DNS records, you can point the entire domain to Vercel:

1. In Namecheap → Domain → Nameservers
2. Select "Custom DNS"
3. Add these Vercel nameservers:
   - ns1.vercel-dns.com
   - ns2.vercel-dns.com

## Verification Steps

After DNS changes (allow 24-48 hours for propagation):

1. Test domain resolution:
   ```bash
   nslookup clawhq.dev
   ```

2. Test in browser:
   ```
   https://clawhq.dev
   https://www.clawhq.dev
   ```

3. Verify SSL certificate is active (green lock icon)

## Current Project URLs
- **Production**: https://clawhq-alr2525xq-malchiiors-projects.vercel.app
- **Target**: https://clawhq.dev (pending DNS)
- **Vercel Dashboard**: https://vercel.com/malchiiors-projects/clawhq

## Troubleshooting

### If domain doesn't resolve after 48 hours:
1. Check DNS propagation: https://dnschecker.org
2. Verify Namecheap DNS settings
3. Check Vercel domain configuration
4. Contact Namecheap support if needed

### Common Issues:
- **SSL Certificate Error**: Wait 24-48h after DNS change
- **404 on subdirectories**: Check vercel.json rewrite rules
- **Mixed content warnings**: Ensure all assets use HTTPS

## Next Steps After DNS is Live:
1. Verify SSL certificate is active ✅
2. Test all pages and functionality
3. Update marketing materials with new domain
4. Set up monitoring for uptime
5. Configure Google Analytics with new domain