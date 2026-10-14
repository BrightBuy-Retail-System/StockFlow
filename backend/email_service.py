import os
import json
import logging
import threading
import urllib.request
import urllib.error
from dotenv import load_dotenv

def _load_env_safely():
    """Ensures .env is loaded whether running from project root or backend dir."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base_dir, ".env"),
        os.path.join(base_dir, "..", ".env"),
        os.path.join(os.getcwd(), "backend", ".env"),
        os.path.join(os.getcwd(), ".env"),
    ]
    for p in candidates:
        if os.path.exists(p):
            load_dotenv(p, override=True)

_load_env_safely()

logger = logging.getLogger("email_service")
logger.setLevel(logging.INFO)

RESEND_API_URL = "https://api.resend.com/emails"


def _send_via_resend(api_key: str, from_email: str, to_email: str, subject: str, html_content: str):
    """Sends email via Resend API using standard library urllib."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "BrightBuy-Ecommerce/1.0",
    }

    if not from_email:
        from_email = "BrightBuy Ecommerce <onboarding@resend.dev>"

    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(RESEND_API_URL, data=data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            res_body = response.read().decode("utf-8")
            logger.info(f"[Email Service - Resend] Sent '{subject}' to {to_email}. Response: {res_body}")
            return True
    except urllib.error.HTTPError as exc:
        err_msg = exc.read().decode("utf-8")
        logger.error(f"[Email Service - Resend] HTTP {exc.code} for {to_email}: {err_msg}")
        return False
    except Exception as exc:
        logger.error(f"[Email Service - Resend] Network error for {to_email}: {exc}")
        return False


def _dispatch_email(to_email: str, to_name: str, subject: str, html_content: str):
    """Core dispatcher that sends emails using Resend."""
    _load_env_safely()
    resend_key = os.getenv("RESEND_API_KEY", "").strip()
    from_email = os.getenv("RESEND_FROM_EMAIL", "").strip()

    # Default to BrightBuy Ecommerce sender
    if not from_email:
        from_email = "BrightBuy Ecommerce <onboarding@resend.dev>"

    if not resend_key:
        logger.warning(f"[Email Service - Resend] RESEND_API_KEY not configured. Email '{subject}' to {to_email} skipped.")
        return False

    return _send_via_resend(resend_key, from_email, to_email, subject, html_content)


def send_email_async(to_email: str, to_name: str, subject: str, html_content: str):
    """Dispatches email asynchronously in a background thread."""
    thread = threading.Thread(
        target=_dispatch_email,
        args=(to_email, to_name, subject, html_content),
        daemon=True,
    )
    thread.start()
    return thread


# =============================================================================
# HTML EMAIL TEMPLATES
# =============================================================================

def _base_email_template(title: str, content_html: str) -> str:
    """Modern, clean responsive HTML email wrapper with BrightBuy Ecommerce branding."""
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
        <tr>
            <td align="center">
                <table width="100%" max-width="600" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                    <!-- Brand Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 32px; text-align: left;">
                            <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Bright<span style="color: #38bdf8;">Buy</span> <span style="font-size: 14px; font-weight: 500; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Ecommerce</span></span>
                            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px;">Smart Retail & Premium Shopping</div>
                        </td>
                    </tr>
                    <!-- Main Body -->
                    <tr>
                        <td style="padding: 32px 32px 24px 32px;">
                            {content_html}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b;">
                            <p style="margin: 0 0 6px 0;">This is an automated transactional notification from BrightBuy Ecommerce.</p>
                            <p style="margin: 0;">© 2026 BrightBuy Ecommerce Inc. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""


# 1. Registration OTP
def send_registration_otp_email(to_email: str, username: str, otp_code: str):
    subject = f"Your BrightBuy Ecommerce Verification Code: {otp_code}"
    body = f"""
        <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 22px; font-weight: 700;">Welcome to BrightBuy Ecommerce!</h2>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569;">
            Hi <strong>{username or 'there'}</strong>, thank you for joining us. Please enter this verification code to complete your registration:
        </p>
        <div style="text-align: center; margin: 28px 0;">
            <div style="display: inline-block; background-color: #f0fdf4; border: 2px dashed #22c55e; border-radius: 8px; padding: 12px 32px;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #15803d; font-family: 'Courier New', Courier, monospace;">{otp_code}</span>
            </div>
            <p style="margin: 10px 0 0 0; font-size: 13px; color: #64748b;">Valid for <strong>10 minutes</strong>.</p>
        </div>
        <p style="margin: 0; font-size: 13px; color: #64748b;">If you did not request this, please ignore this email.</p>
    """
    return send_email_async(to_email, username, subject, _base_email_template("Registration Verification", body))


# 2. Forgot Password OTP
def send_forgot_password_otp_email(to_email: str, username: str, otp_code: str):
    subject = f"BrightBuy Ecommerce Password Reset Code: {otp_code}"
    body = f"""
        <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 22px; font-weight: 700;">Password Reset Request</h2>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569;">
            Hi <strong>{username or 'there'}</strong>, we received a request to reset your password. Use the verification code below:
        </p>
        <div style="text-align: center; margin: 28px 0;">
            <div style="display: inline-block; background-color: #eff6ff; border: 2px dashed #3b82f6; border-radius: 8px; padding: 12px 32px;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1d4ed8; font-family: 'Courier New', Courier, monospace;">{otp_code}</span>
            </div>
            <p style="margin: 10px 0 0 0; font-size: 13px; color: #64748b;">Valid for <strong>10 minutes</strong>.</p>
        </div>
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #92400e;">
                <strong>Security Notice:</strong> If you did not make this request, your account may be at risk. We recommend changing your password.
            </p>
        </div>
    """
    return send_email_async(to_email, username, subject, _base_email_template("Password Reset", body))


# 3. Password Reset Success Confirmation
def send_password_reset_success_email(to_email: str, username: str):
    subject = "Your BrightBuy Ecommerce Password Has Been Successfully Changed"
    body = f"""
        <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 22px; font-weight: 700;">Password Updated Successfully</h2>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569;">
            Hi <strong>{username or 'there'}</strong>, your password for BrightBuy Ecommerce has been successfully reset.
        </p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 18px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #166534;">
                ✓ Your account is secure and you can now log in with your new password.
            </p>
        </div>
    """
    return send_email_async(to_email, username, subject, _base_email_template("Password Changed", body))


# 4. Order Placed Mail
def send_order_placed_email(
    to_email: str,
    customer_name: str,
    order_id: int,
    total_amount: float,
    items: list,
    shipping_address: str = "",
    tracking_number: str = "",
):
    subject = f"Order #{order_id} Confirmed - BrightBuy Ecommerce Receipt"

    items_rows = ""
    for item in (items or []):
        name = item.get("title") or item.get("product_name") or item.get("name") or f"Item #{item.get('variant_id', '')}"
        qty = item.get("quantity", 1)
        price = float(item.get("unit_price") or item.get("price") or 0.0)
        row_total = qty * price
        items_rows += f"""
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 6px; font-size: 14px; color: #334155;">{name}</td>
                <td style="padding: 10px 6px; font-size: 14px; color: #64748b; text-align: center;">{qty}</td>
                <td style="padding: 10px 6px; font-size: 14px; color: #334155; text-align: right;">${price:.2f}</td>
                <td style="padding: 10px 6px; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">${row_total:.2f}</td>
            </tr>
        """

    tracking_badge = ""
    if tracking_number:
        tracking_badge = f"""
            <p style="margin: 6px 0; font-size: 14px; color: #475569;">
                <strong>Tracking Number:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">{tracking_number}</span>
            </p>
        """

    address_info = ""
    if shipping_address:
        address_info = f"""
            <p style="margin: 6px 0; font-size: 14px; color: #475569;">
                <strong>Shipping Address:</strong> {shipping_address}
            </p>
        """

    body = f"""
        <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 700;">Order Confirmed!</h2>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">Order Reference: <strong>#{order_id}</strong></p>
        </div>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">
            Hi <strong>{customer_name or 'Valued Customer'}</strong>, your order has been received and is being prepared by the BrightBuy Ecommerce fulfillment team.
        </p>

        {tracking_badge}
        {address_info}

        <h3 style="margin: 24px 0 10px 0; font-size: 16px; color: #0f172a;">Order Summary</h3>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 10px 6px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Product</th>
                    <th style="padding: 10px 6px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase;">Qty</th>
                    <th style="padding: 10px 6px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase;">Price</th>
                    <th style="padding: 10px 6px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase;">Total</th>
                </tr>
            </thead>
            <tbody>
                {items_rows}
            </tbody>
        </table>

        <div style="background-color: #f8fafc; padding: 16px 20px; border-radius: 8px; text-align: right;">
            <span style="font-size: 14px; color: #64748b; margin-right: 12px;">Total Paid / Due:</span>
            <span style="font-size: 22px; font-weight: 800; color: #0f172a;">${float(total_amount):.2f}</span>
        </div>
    """
    return send_email_async(to_email, customer_name, subject, _base_email_template(f"Order #{order_id} Confirmed", body))


# 5. Payment Verified Mail
def send_payment_verified_email(
    to_email: str,
    customer_name: str,
    order_id: int,
    amount: float,
    payment_method: str,
    transaction_ref: str,
):
    subject = f"Payment Verified for Order #{order_id} - BrightBuy Ecommerce"
    body = f"""
        <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 22px; font-weight: 700;">Payment Successful</h2>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569;">
            Hi <strong>{customer_name or 'Valued Customer'}</strong>, your payment for <strong>Order #{order_id}</strong> has been successfully processed.
        </p>

        <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #166534;"><strong>Amount Settled:</strong></td>
                    <td style="padding: 6px 0; font-size: 18px; font-weight: 800; color: #14532d; text-align: right;">${float(amount):.2f}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #166534;"><strong>Payment Method:</strong></td>
                    <td style="padding: 6px 0; font-size: 14px; color: #14532d; text-align: right;">{payment_method}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #166534;"><strong>Transaction Reference:</strong></td>
                    <td style="padding: 6px 0; font-size: 13px; font-family: monospace; color: #14532d; text-align: right;">{transaction_ref}</td>
                </tr>
            </table>
        </div>
        <p style="margin: 0; font-size: 13px; color: #64748b;">
            Your order is now being prepped for dispatch. Thank you for shopping with BrightBuy Ecommerce!
        </p>
    """
    return send_email_async(to_email, customer_name, subject, _base_email_template(f"Payment Receipt #{order_id}", body))


# 6. Order Cancelled Mail
def send_order_cancelled_email(
    to_email: str,
    customer_name: str,
    order_id: int,
    total_amount: float,
    reason: str = "Order cancellation requested",
):
    subject = f"Order #{order_id} Cancelled - BrightBuy Ecommerce"
    body = f"""
        <h2 style="margin: 0 0 16px 0; color: #dc2626; font-size: 22px; font-weight: 700;">Order #{order_id} Cancelled</h2>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569;">
            Hi <strong>{customer_name or 'Valued Customer'}</strong>, your Order <strong>#{order_id}</strong> (Total: ${float(total_amount):.2f}) has been cancelled.
        </p>

        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #991b1b;">
                <strong>Status:</strong> {reason}
            </p>
        </div>

        <p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">
            • Reserved items have been returned to inventory.<br>
            • If you made an online payment, a refund has been initiated to your account.
        </p>
    """
    return send_email_async(to_email, customer_name, subject, _base_email_template(f"Order #{order_id} Cancelled", body))


# 7. Order Status Update (Dispatched / Shipped / Delivered)
def send_order_status_update_email(
    to_email: str,
    customer_name: str,
    order_id: int,
    new_status: str,
    tracking_number: str = "",
    estimated_arrival: str = "",
):
    subject = f"Order #{order_id} Status Update: {new_status} - BrightBuy Ecommerce"

    status_color = "#3b82f6"
    status_msg = f"Your order is currently <strong>{new_status}</strong>."
    if new_status == "SHIPPED":
        status_color = "#8b5cf6"
        status_msg = "Your order has been dispatched from our distribution center and is on its way."
    elif new_status == "DELIVERED":
        status_color = "#10b981"
        status_msg = "Your package has been successfully delivered! We hope you enjoy your purchase."

    tracking_details = ""
    if tracking_number:
        tracking_details += f"""
            <p style="margin: 6px 0; font-size: 14px; color: #334155;">
                <strong>Tracking Number:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">{tracking_number}</span>
            </p>
        """
    if estimated_arrival:
        tracking_details += f"""
            <p style="margin: 6px 0; font-size: 14px; color: #334155;">
                <strong>Estimated Arrival:</strong> {estimated_arrival}
            </p>
        """

    body = f"""
        <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 22px; font-weight: 700;">Order Status Update</h2>
        <div style="display: inline-block; background-color: {status_color}; color: #ffffff; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; text-transform: uppercase; margin-bottom: 16px;">
            {new_status}
        </div>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">
            Hi <strong>{customer_name or 'Valued Customer'}</strong>,
        </p>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155;">
            {status_msg}
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">
                <strong>Order ID:</strong> #{order_id}
            </p>
            {tracking_details}
        </div>
    """
    return send_email_async(to_email, customer_name, subject, _base_email_template(f"Order #{order_id} Update", body))


# 8. Staff / Manager Onboarding Welcome
def send_staff_welcome_email(to_email: str, username: str, role_name: str, temp_password: str):
    subject = f"Welcome to BrightBuy Ecommerce - Your {role_name} Credentials"
    body = f"""
        <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 22px; font-weight: 700;">Welcome to BrightBuy Ecommerce</h2>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">
            Hi <strong>{username or 'there'}</strong>, your corporate account has been provisioned as a <strong>{role_name}</strong>.
        </p>
        <div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">
                <strong>Login Email:</strong> <span style="font-family: monospace; color: #0f172a;">{to_email}</span>
            </p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">
                <strong>Role:</strong> <span style="color: #2563eb; font-weight: 600;">{role_name}</span>
            </p>
            <p style="margin: 0; font-size: 14px; color: #334155;">
                <strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-weight: 700; color: #0f172a;">{temp_password}</code>
            </p>
        </div>
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #92400e;">
                <strong>Security Action Required:</strong> For security compliance, please log in and immediately change your password using the "Change Password" option in your account menu.
            </p>
        </div>
    """
    return send_email_async(to_email, username, subject, _base_email_template("Staff Welcome", body))


# 9. Staff / Manager Password Reset by Admin
def send_staff_credentials_reset_email(to_email: str, username: str, new_temp_password: str):
    subject = "BrightBuy Ecommerce - Your Account Password Has Been Reset"
    body = f"""
        <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 22px; font-weight: 700;">Staff Password Reset</h2>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">
            Hi <strong>{username or 'there'}</strong>, your BrightBuy account password has been reset by a System Administrator.
        </p>
        <div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">
                <strong>Login Email:</strong> <span style="font-family: monospace; color: #0f172a;">{to_email}</span>
            </p>
            <p style="margin: 0; font-size: 14px; color: #334155;">
                <strong>New Temporary Password:</strong> <code style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-weight: 700; color: #0f172a;">{new_temp_password}</code>
            </p>
        </div>
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #1e40af;">
                Please sign in with this temporary password and update it to your personal secure password as soon as possible.
            </p>
        </div>
    """
    return send_email_async(to_email, username, subject, _base_email_template("Staff Password Reset", body))

