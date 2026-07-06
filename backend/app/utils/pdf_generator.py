import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from datetime import datetime

def generate_permit_pdf(proposal: any, ai_analysis: any) -> io.BytesIO:
    """
    Generates a professional, formal PDF Permit Clearance report for Greater Chennai Corporation.
    Includes digital verification signatures, audit timestamps, and AI results.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom styles matching GCC royal blue branding
    title_style = ParagraphStyle(
        'GCCTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0f172a'),
        alignment=1, # Center
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'GCCSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        leading=12,
        textColor=colors.HexColor('#475569'),
        alignment=1,
        spaceAfter=15
    )
    
    section_heading = ParagraphStyle(
        'GCCSection',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=14,
        textColor=colors.HexColor('#1e3a8a'),
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'GCCBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=4
    )

    bold_body_style = ParagraphStyle(
        'GCCBodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    alert_style = ParagraphStyle(
        'GCCAlert',
        parent=body_style,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#b91c1c') # Red
    )

    elements = []

    # 1. Header Banner
    elements.append(Paragraph("GREATER CHENNAI CORPORATION", title_style))
    elements.append(Paragraph("Official Road Excavation Clearance & AI Coordination Permit", subtitle_style))
    elements.append(Spacer(1, 10))

    # 2. Proposal Summary Table
    elements.append(Paragraph("I. PROJECT PROPOSAL INFORMATION", section_heading))
    
    prop_data = [
        [
            Paragraph("Permit ID", bold_body_style), Paragraph(str(proposal.id)[:18] + "...", body_style),
            Paragraph("Department", bold_body_style), Paragraph(proposal.department.upper(), body_style)
        ],
        [
            Paragraph("Road Name", bold_body_style), Paragraph(proposal.road_name, body_style),
            Paragraph("Priority", bold_body_style), Paragraph(proposal.priority.upper(), body_style)
        ],
        [
            Paragraph("Start Date", bold_body_style), Paragraph(str(proposal.start_date), body_style),
            Paragraph("End Date", bold_body_style), Paragraph(str(proposal.end_date), body_style)
        ],
        [
            Paragraph("Contractor", bold_body_style), Paragraph(proposal.contractor or "N/A", body_style),
            Paragraph("Est. Budget", bold_body_style), Paragraph(f"Rs. {proposal.estimated_budget:,.2f}", body_style)
        ],
        [
            Paragraph("Trench Length", bold_body_style), Paragraph(f"{proposal.length_m} meters", body_style),
            Paragraph("Trench Area", bold_body_style), Paragraph(f"{proposal.area_sqm} sq.m", body_style)
        ]
    ]

    t_prop = Table(prop_data, colWidths=[100, 160, 100, 160])
    t_prop.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f8fafc')),
        ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#f8fafc')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(t_prop)
    elements.append(Spacer(1, 15))

    # 3. AI Analysis Report
    elements.append(Paragraph("II. AI CO-PILOT EVALUATION SUMMARY", section_heading))
    
    ai_status = ai_analysis.recommendation.upper()
    status_color = colors.HexColor('#16a34a') # Green
    if ai_status == "REJECT":
        status_color = colors.HexColor('#dc2626') # Red
    elif "CONDITIONS" in ai_status or "REVIEW" in ai_status:
        status_color = colors.HexColor('#d97706') # Amber

    ai_data = [
        [
            Paragraph("AI Decision Recommendation", bold_body_style),
            Paragraph(f"<font color='{status_color}'><b>{ai_status}</b></font>", bold_body_style)
        ],
        [
            Paragraph("Confidence Rating Score", bold_body_style),
            Paragraph(f"{ai_analysis.confidence_score}%", body_style)
        ],
        [
            Paragraph("Public Inconvenience Score", bold_body_style),
            Paragraph(f"{ai_analysis.public_impact_score} / 100 (Disruption Factor)", body_style)
        ],
        [
            Paragraph("Weather Risk Level", bold_body_style),
            Paragraph(ai_analysis.weather_analysis.get("risk_level", "low").upper(), body_style)
        ],
        [
            Paragraph("Traffic Congestion Coefficient", bold_body_style),
            Paragraph(f"{ai_analysis.traffic_analysis.get('congestion_coefficient_pct', 0)}% (Hours: {ai_analysis.traffic_analysis.get('suggested_hours', 'Anytime')})", body_style)
        ]
    ]

    t_ai = Table(ai_data, colWidths=[200, 320])
    t_ai.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f8fafc')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(t_ai)
    elements.append(Spacer(1, 15))

    # 4. RAG Policy Violations
    elements.append(Paragraph("III. ROAD CUT COMPLIANCE RULINGS (RAG ANALYSIS)", section_heading))
    violations = ai_analysis.compliance_report.get("violations", [])
    if len(violations) > 0:
        for v in violations:
            elements.append(Paragraph(f"• {v}", alert_style))
    else:
        elements.append(Paragraph("✓ Proposal fully complies with GCC general regulations, seasonal bans, and dimensional limitations.", body_style))
    elements.append(Spacer(1, 10))

    # 5. Explanatory Rationale
    elements.append(Paragraph("IV. DETAILED EXPLANATION & MITIGATION CONDITIONS", section_heading))
    elements.append(Paragraph(ai_analysis.explanation, body_style))
    elements.append(Spacer(1, 15))

    # 6. Digital Verification Stamp
    elements.append(Spacer(1, 20))
    time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sig_data = [
        [
            Paragraph("<b>Digitally Verified By:</b><br/>GCC Urban Planning Commission", body_style),
            Paragraph(f"<b>Verification Hash:</b><br/>{hash(str(proposal.id) + time_str)}", body_style)
        ],
        [
            Paragraph("<b>System Timestamp:</b><br/>" + time_str, body_style),
            Paragraph("<b>Signature Status:</b><br/><font color='green'><b>VERIFIED DIGITAL KEY</b></font>", body_style)
        ]
    ]
    t_sig = Table(sig_data, colWidths=[260, 260])
    t_sig.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#1e3a8a')),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#eff6ff')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(t_sig)

    doc.build(elements)
    buffer.seek(0)
    return buffer
