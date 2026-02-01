import * as React from 'react';

interface EmailTemplateProps {
  previewText: string;
  children: React.ReactNode;
  organizationName?: string;
}

export function EmailTemplate({
  previewText,
  children,
  organizationName = 'Skali Prog',
}: EmailTemplateProps) {
  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>{previewText}</title>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          .card {
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            padding: 40px;
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo {
            font-size: 24px;
            font-weight: 700;
            color: #0a0a0a;
            text-decoration: none;
          }
          .content {
            margin-bottom: 32px;
          }
          h1 {
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 16px 0;
            color: #0a0a0a;
          }
          p {
            margin: 0 0 16px 0;
            color: #4a4a4a;
          }
          .button {
            display: inline-block;
            background-color: #0a0a0a;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 500;
            font-size: 16px;
            margin: 16px 0;
          }
          .button:hover {
            background-color: #1a1a1a;
          }
          .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e5e5e5;
          }
          .footer p {
            font-size: 14px;
            color: #6b6b6b;
            margin: 0;
          }
          .info-box {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 20px;
            margin: 16px 0;
          }
          .info-box p {
            margin: 4px 0;
          }
          .highlight {
            color: #0a0a0a;
            font-weight: 600;
          }
          .text-muted {
            color: #6b6b6b;
            font-size: 14px;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="card">
            <div className="header">
              <span className="logo">{organizationName}</span>
            </div>
            <div className="content">
              {children}
            </div>
            <div className="footer">
              <p>{organizationName}</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

interface ButtonProps {
  href: string;
  children: React.ReactNode;
}

export function EmailButton({ href, children }: ButtonProps) {
  return (
    <a href={href} className="button" style={{ display: 'inline-block', backgroundColor: '#0a0a0a', color: '#ffffff', textDecoration: 'none', padding: '14px 28px', borderRadius: '8px', fontWeight: 500, fontSize: '16px', margin: '16px 0' }}>
      {children}
    </a>
  );
}

interface InfoBoxProps {
  children: React.ReactNode;
}

export function EmailInfoBox({ children }: InfoBoxProps) {
  return (
    <div className="info-box" style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '20px', margin: '16px 0' }}>
      {children}
    </div>
  );
}
