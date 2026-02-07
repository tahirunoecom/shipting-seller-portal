<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Successful</title>
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

        .checkmark-container {
            width: 80px;
            height: 80px;
            margin: 0 auto 25px;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
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

        .checkmark {
            width: 40px;
            height: 40px;
            stroke: white;
            stroke-width: 3;
            fill: none;
            animation: drawCheck 0.6s ease-out 0.3s forwards;
            stroke-dasharray: 50;
            stroke-dashoffset: 50;
        }

        @keyframes drawCheck {
            to { stroke-dashoffset: 0; }
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

        .store-name {
            color: #764ba2;
            font-weight: 600;
        }

        .btn-whatsapp {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
            color: white;
            padding: 16px 32px;
            border-radius: 30px;
            text-decoration: none;
            font-weight: 600;
            font-size: 18px;
            margin: 10px 0;
            width: 100%;
            max-width: 280px;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4);
        }

        .btn-whatsapp:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(37, 211, 102, 0.5);
        }

        .btn-whatsapp:active {
            transform: translateY(0);
        }

        .whatsapp-icon {
            width: 24px;
            height: 24px;
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

        .divider {
            margin: 20px 0;
            color: #ccc;
            font-size: 14px;
        }

        .order-info {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
        }

        .order-info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }

        .order-info-row:last-child {
            border-bottom: none;
        }

        .order-info-label {
            color: #888;
            font-size: 14px;
        }

        .order-info-value {
            color: #333;
            font-weight: 500;
            font-size: 14px;
        }

        .pulse {
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
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

            .btn-whatsapp {
                padding: 14px 28px;
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Animated Checkmark -->
        <div class="checkmark-container">
            <svg class="checkmark" viewBox="0 0 24 24">
                <path d="M5 12l5 5L20 7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>

        <h1>Payment Successful!</h1>

        @php
            $whatsapp_number = $whatsapp_number ?? null;
            $store_name = $store_name ?? 'Store';
            $session_id = $session_id ?? null;

            // Build WhatsApp URL
            if ($whatsapp_number) {
                $wa_url = "https://wa.me/{$whatsapp_number}?text=" . urlencode("I've completed my payment! ✅");
            } else {
                // Fallback: just open WhatsApp (works on mobile and desktop)
                $wa_url = "https://wa.me/";
            }
        @endphp

        <p class="subtitle">
            @if($whatsapp_number)
                Your order with <span class="store-name">{{ $store_name }}</span> has been confirmed!
            @else
                Your order has been confirmed! Return to WhatsApp to continue.
            @endif
        </p>

        <!-- WhatsApp Return Button - Always shown -->
        <a href="{{ $wa_url }}" class="btn-whatsapp" id="whatsapp-btn">
            <svg class="whatsapp-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Return to WhatsApp
        </a>

        <p class="divider">or</p>

        <a href="https://stage.anythinginstantly.com" class="btn-secondary">
            Return to Home
        </a>

        @if($session_id)
        <div class="order-info">
            <div class="order-info-row">
                <span class="order-info-label">Status</span>
                <span class="order-info-value" style="color: #4CAF50;">✓ Paid</span>
            </div>
            <div class="order-info-row">
                <span class="order-info-label">Reference</span>
                <span class="order-info-value" style="font-size: 12px; word-break: break-all;">{{ Str::limit($session_id, 30) }}</span>
            </div>
        </div>
        @endif

        <p style="color: #999; font-size: 12px; margin-top: 20px;">
            You can close this window safely.
        </p>
    </div>

    <script>
        // Auto-redirect to WhatsApp after 3 seconds
        @if($whatsapp_number)
        setTimeout(() => {
            window.location.href = "{{ $wa_url }}";
        }, 3000);

        // Show countdown
        let countdown = 3;
        const countdownEl = document.createElement('p');
        countdownEl.className = 'pulse';
        countdownEl.style.cssText = 'color: #25D366; font-size: 14px; margin-top: 15px;';
        document.querySelector('.container').appendChild(countdownEl);

        const timer = setInterval(() => {
            countdownEl.textContent = `Redirecting to WhatsApp in ${countdown}...`;
            countdown--;
            if (countdown < 0) {
                clearInterval(timer);
            }
        }, 1000);
        @endif
    </script>
</body>
</html>
