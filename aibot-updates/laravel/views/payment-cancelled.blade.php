<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Cancelled</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 20px;
            padding: 40px 30px;
            text-align: center;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .icon-container {
            width: 80px;
            height: 80px;
            margin: 0 auto 25px;
            background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: scaleIn 0.5s ease-out;
        }

        @keyframes scaleIn {
            0% { transform: scale(0); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }

        .icon-container svg {
            width: 40px;
            height: 40px;
            stroke: white;
            stroke-width: 2.5;
            fill: none;
        }

        h1 {
            color: #333;
            font-size: 24px;
            margin-bottom: 10px;
        }

        .subtitle {
            color: #666;
            font-size: 16px;
            margin-bottom: 25px;
            line-height: 1.5;
        }

        .btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 32px;
            border-radius: 30px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            margin: 10px 0;
            width: 100%;
            max-width: 280px;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }

        .btn-secondary {
            display: inline-block;
            background: #f0f0f0;
            color: #666;
            padding: 12px 24px;
            border-radius: 25px;
            text-decoration: none;
            font-size: 14px;
            margin-top: 15px;
            transition: background 0.2s;
        }

        .btn-secondary:hover {
            background: #e0e0e0;
        }

        .help-text {
            background: #fff8e1;
            border-radius: 12px;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            border-left: 4px solid #ff9800;
        }

        .help-text p {
            color: #666;
            font-size: 14px;
            line-height: 1.5;
        }

        .help-text strong {
            color: #333;
        }

        /* Mobile optimizations */
        @media (max-width: 480px) {
            .container {
                padding: 30px 20px;
                border-radius: 15px;
            }

            h1 {
                font-size: 22px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Warning Icon -->
        <div class="icon-container">
            <svg viewBox="0 0 24 24">
                <path d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4.99c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>

        <h1>Payment Cancelled</h1>

        <p class="subtitle">
            Your payment was cancelled. Don't worry, no charges were made.
        </p>

        <div class="help-text">
            <p>
                <strong>Need help?</strong><br>
                Your cart items are still saved. You can return to WhatsApp and try again when you're ready.
            </p>
        </div>

        <a href="javascript:history.back()" class="btn-primary">
            ← Try Again
        </a>

        <br>

        <a href="https://stage.anythinginstantly.com" class="btn-secondary">
            Return to Home
        </a>

        <p style="color: #999; font-size: 12px; margin-top: 20px;">
            You can close this window safely.
        </p>
    </div>
</body>
</html>
