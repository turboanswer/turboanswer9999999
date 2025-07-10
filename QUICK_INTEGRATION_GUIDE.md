# 🚀 Quick Integration Guide - Add AI to Your Website in 2 Minutes

## Step 1: Add the Widget Script

Copy this code and paste it before the closing `</body>` tag on your website:

```html
<script src="https://turbo-answer-ai.uc.r.appspot.com/widget/turbo-widget.js"></script>
<script>
TurboWidget.init({
    primaryColor: '#3b82f6',
    position: 'bottom-right'
});
</script>
```

**That's it!** Your AI assistant is now live on your website.

## Step 2: Customize for Your Business

### E-commerce Store
```html
<script>
TurboWidget.init({
    primaryColor: '#10b981',
    welcomeMessage: 'Hi! Need help finding products?',
    position: 'bottom-right'
});
</script>
```

### SaaS Platform
```html
<script>
TurboWidget.init({
    primaryColor: '#8b5cf6',
    welcomeMessage: 'Welcome! How can I help you get started?',
    size: 'large'
});
</script>
```

### Professional Services
```html
<script>
TurboWidget.init({
    primaryColor: '#1f2937',
    welcomeMessage: 'Hello! Ask me about our services.',
    theme: 'dark'
});
</script>
```

## Step 3: Advanced Configuration

### Full Configuration Options
```html
<script>
TurboWidget.init({
    // Required for premium features
    apiKey: 'your-api-key-here',
    
    // Appearance
    primaryColor: '#ff6b35',
    theme: 'auto',  // 'light', 'dark', 'auto'
    size: 'medium', // 'small', 'medium', 'large'
    position: 'bottom-left', // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
    
    // Messages
    welcomeMessage: 'Hi! How can I help your business today?',
    
    // Analytics (optional)
    onMessage: function(message, response) {
        // Track with Google Analytics
        gtag('event', 'ai_chat', {
            'message_length': message.length,
            'domain': window.location.hostname
        });
    }
});
</script>
```

## Integration Examples by Platform

### WordPress
Add to your theme's `footer.php` file before `</body>`:
```html
<script src="https://turbo-answer-ai.uc.r.appspot.com/widget/turbo-widget.js"></script>
<script>
TurboWidget.init({
    primaryColor: '<?php echo get_theme_mod('primary_color', '#3b82f6'); ?>',
    welcomeMessage: 'Hi! How can I help you today?'
});
</script>
```

### Shopify
Add to your theme's `theme.liquid` file before `</body>`:
```html
<script src="https://turbo-answer-ai.uc.r.appspot.com/widget/turbo-widget.js"></script>
<script>
TurboWidget.init({
    primaryColor: '{{ settings.accent_color }}',
    welcomeMessage: 'Hi! Need help with our products?'
});
</script>
```

### React/Next.js
```jsx
import { useEffect } from 'react';

export default function Layout({ children }) {
  useEffect(() => {
    // Load widget script
    const script = document.createElement('script');
    script.src = 'https://turbo-answer-ai.uc.r.appspot.com/widget/turbo-widget.js';
    script.onload = () => {
      window.TurboWidget.init({
        primaryColor: '#3b82f6',
        position: 'bottom-right'
      });
    };
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return <div>{children}</div>;
}
```

### HTML/Static Sites
Add anywhere in your HTML:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Your Website</title>
</head>
<body>
    <!-- Your website content -->
    
    <!-- AI Widget (add before closing body tag) -->
    <script src="https://turbo-answer-ai.uc.r.appspot.com/widget/turbo-widget.js"></script>
    <script>
    TurboWidget.init({
        primaryColor: '#3b82f6',
        welcomeMessage: 'Hi! How can I help you?'
    });
    </script>
</body>
</html>
```

## API Integration for Advanced Users

### Programmatic Control
```javascript
// Open widget programmatically
TurboWidget.open();

// Send message automatically
TurboWidget.sendMessage('Hello, I need help with pricing');

// Close widget
TurboWidget.close();

// Listen for events
TurboWidget.on('message', function(data) {
    console.log('User asked:', data.message);
    console.log('AI responded:', data.response);
});
```

### Custom Triggers
```javascript
// Open widget when user clicks a button
document.getElementById('help-button').onclick = function() {
    TurboWidget.open();
};

// Send predefined message
document.getElementById('pricing-question').onclick = function() {
    TurboWidget.sendMessage('Can you tell me about your pricing plans?');
};
```

## Testing Your Integration

### 1. Basic Test
- Load your website
- Look for the blue chat button in bottom-right corner
- Click it and type a message
- Verify AI responds appropriately

### 2. Mobile Test
- Test on mobile device
- Ensure widget is responsive
- Check that chat interface works properly

### 3. Analytics Test (if configured)
```javascript
// Check if analytics are working
TurboWidget.init({
    onMessage: function(message, response) {
        console.log('Analytics:', {
            message: message,
            response_time: response.time,
            domain: window.location.hostname
        });
    }
});
```

## Troubleshooting

### Widget Not Appearing
1. Check browser console for errors
2. Verify script URL is accessible
3. Ensure no ad blockers are interfering

### Widget Not Responding
1. Check internet connection
2. Verify API endpoints are accessible
3. Check for JavaScript errors in console

### Styling Issues
1. Check for CSS conflicts
2. Try different position settings
3. Adjust z-index if widget is hidden

## Get Your API Key

For premium features and unlimited usage:

1. **Email**: turboanswer@hotmail.com
2. **Subject**: "Widget API Key Request"
3. **Include**: Your website domain and expected usage

### Pricing
- **Free**: 100 conversations/month
- **Business**: $29/month for unlimited usage
- **Enterprise**: Custom pricing for advanced features

## Support

- **Documentation**: Visit `/widget/integration-guide` on your deployed instance
- **Live Demo**: Visit `/business` to see the widget in action
- **Email Support**: turboanswer@hotmail.com
- **Phone**: (201) 691-8466

Your AI assistant is now ready to help customers on your website 24/7!