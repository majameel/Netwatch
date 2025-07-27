#!/bin/bash
SUMMARY=$(cat << EOF
ISP Monitor Weekly Summary - $(date)

System Health:
- Disk Usage: $(df -h / | grep -v Filesystem | awk '{print $5}')
- Service Status: $(sudo systemctl is-active isp-monitor.service)
- Uptime: $(uptime -p)

This Week's Statistics:
- Total Checks: $(wc -l < ~/isp-monitor/detailed_monitor_log.csv)
- Packet Loss Events: $(grep -c "timeout" ~/isp-monitor/packet_loss_log.csv)
- Email Alerts Sent: $(grep -c "Email sent" ~/isp-monitor/isp_monitor.log)

Log File Sizes:
$(du -h ~/isp-monitor/* | sort -h)

Recent Activity:
$(tail -10 ~/isp-monitor/isp_monitor.log)
EOF
)

# Send email summary to multiple recipients
python3 -c "
import smtplib
from email.mime.text import MIMEText

msg = MIMEText('''$SUMMARY''')
msg['Subject'] = 'ISP Monitor Weekly Summary'
msg['From'] = 'mohammed.abdul@techolution.com'
msg['To'] = 'mohammed.abdul@techolution.com'

server = smtplib.SMTP('smtp.gmail.com', 587)
server.starttls()
server.login('mohammed.abdul@techolution.com', 'vlzz kqqr mhfp wvui')

# Send to multiple recipients
to_emails = ['mohammed.abdul@techolution.com']
server.sendmail('mohammed.abdul@techolution.com', to_emails, msg.as_string())
server.quit()
print('Weekly summary sent to recipient!')
"
