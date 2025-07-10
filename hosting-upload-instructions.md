# Hosting Upload Instructions

## Files to Upload to Your Custom Domain

### Required Files
1. **privacy-policy-website.html** → Rename to **index.html**
2. **domain-configuration-files/htaccess.txt** → Rename to **.htaccess**
3. **domain-configuration-files/robots.txt** → Upload as **robots.txt**
4. **domain-configuration-files/sitemap.xml** → Upload as **sitemap.xml**

### Upload Steps (cPanel/File Manager)

#### Step 1: Access File Manager
1. Log into your hosting control panel (cPanel)
2. Click "File Manager"
3. Navigate to `public_html` folder (this is your website root)

#### Step 2: Upload Files
1. Click "Upload" button
2. Select and upload these files:
   - `privacy-policy-website.html`
   - `htaccess.txt`
   - `robots.txt`
   - `sitemap.xml`

#### Step 3: Rename Files
1. Right-click `privacy-policy-website.html` → Rename to `index.html`
2. Right-click `htaccess.txt` → Rename to `.htaccess`
3. Leave `robots.txt` and `sitemap.xml` as they are

#### Step 4: Set Permissions
1. Right-click `.htaccess` → Permissions → Set to `644`
2. Right-click `index.html` → Permissions → Set to `644`
3. Right-click other files → Permissions → Set to `644`

### Final Directory Structure
```
public_html/
├── index.html          (Your privacy policy)
├── .htaccess          (Security and redirects)
├── robots.txt         (Search engine instructions)
└── sitemap.xml        (Site structure for search engines)
```

### Test Your Website
1. Visit `https://yourdomain.com` in browser
2. Verify privacy policy loads correctly
3. Check for green SSL lock icon
4. Test on mobile device

### Troubleshooting
- **404 Error:** Check if `index.html` is in the correct folder (`public_html`)
- **Not Secure Warning:** SSL certificate may still be activating (wait 15 minutes)
- **Permission Denied:** Set file permissions to `644`
- **Domain Not Working:** Check nameserver settings with domain registrar

### Domain Examples
- Replace `turboanswer.com` in sitemap.xml with your actual domain
- Update any hardcoded URLs in the privacy policy if needed
- Test all links and contact information

### Next Steps
1. Update your Turbo Answer app links to point to new domain
2. Submit sitemap to Google Search Console
3. Monitor website analytics
4. Set up Google Analytics if desired