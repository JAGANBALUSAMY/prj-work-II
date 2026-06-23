import io
import logging
from datetime import datetime
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, ListFlowable, ListItem
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

from app.models.repository import Repository
from app.repositories.repo_repo import repository_repo

logger = logging.getLogger(__name__)

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        if self._pageNumber == 1:
            self.setFillColor(colors.HexColor('#4F46E5'))
            self.rect(0, 841.89 - 15, 595.27, 15, fill=1, stroke=0)
            self.restoreState()
            return
            
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor('#64748B'))
        
        self.drawString(54, 841.89 - 36, "AI-Powered Repository Survivability & Reproducibility Analyzer")
        self.setStrokeColor(colors.HexColor('#E2E8F0'))
        self.setLineWidth(0.5)
        self.line(54, 841.89 - 42, 595.27 - 54, 841.89 - 42)
        
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(595.27 - 54, 36, page_str)
        self.drawString(54, 36, f"Confidential Report — Generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
        self.line(54, 46, 595.27 - 54, 46)
        
        self.restoreState()

class ReportService:
    @staticmethod
    def _get_styles():
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CoverTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=24,
            leading=30,
            textColor=colors.HexColor('#1E293B'),
            alignment=1,
            spaceAfter=15
        )
        
        subtitle_style = ParagraphStyle(
            'CoverSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=13,
            leading=18,
            textColor=colors.HexColor('#64748B'),
            alignment=1,
            spaceAfter=40
        )
        
        section_title_style = ParagraphStyle(
            'SectionTitle',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#4F46E5'),
            spaceBefore=18,
            spaceAfter=8,
            keepWithNext=True
        )
        
        subsection_title_style = ParagraphStyle(
            'SubSectionTitle',
            parent=styles['Heading3'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#1E293B'),
            spaceBefore=10,
            spaceAfter=6,
            keepWithNext=True
        )
        
        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor('#334155'),
            spaceAfter=8
        )
        
        body_bold = ParagraphStyle(
            'ReportBodyBold',
            parent=body_style,
            fontName='Helvetica-Bold'
        )
        
        code_style = ParagraphStyle(
            'ReportCode',
            parent=styles['Code'],
            fontName='Courier',
            fontSize=8,
            leading=11,
            textColor=colors.HexColor('#0F172A'),
            backColor=colors.HexColor('#F8FAFC'),
            borderColor=colors.HexColor('#E2E8F0'),
            borderWidth=0.5,
            borderPadding=6,
            spaceAfter=8
        )
        
        return {
            "title": title_style,
            "subtitle": subtitle_style,
            "section": section_title_style,
            "subsection": subsection_title_style,
            "body": body_style,
            "body_bold": body_bold,
            "code": code_style,
            "bullet": ParagraphStyle('Bullet', parent=body_style, leftIndent=15, bulletIndent=5)
        }

    @classmethod
    def _cell(cls, text, style, bold=False, color=None):
        font_tag_start = f"<font color='{color}'>" if color else ""
        font_tag_end = "</font>" if color else ""
        bold_tag_start = "<b>" if bold else ""
        bold_tag_end = "</b>" if bold else ""
        return Paragraph(f"{font_tag_start}{bold_tag_start}{text}{bold_tag_end}{font_tag_end}", style)

    @classmethod
    def _make_badge(cls, text, category, style):
        bg_color = '#F1F5F9'
        text_color = '#475569'
        cat = category.lower()
        if 'healthy' in cat or 'success' in cat or 'excellent' in cat or 'good' in cat:
            bg_color = '#D1FAE5'
            text_color = '#065F46'
        elif 'risk' in cat or 'poor' in cat:
            bg_color = '#FFEDD5'
            text_color = '#9A3412'
        elif 'dormant' in cat or 'moderate' in cat:
            bg_color = '#FEF3C7'
            text_color = '#92400E'
        elif 'abandoned' in cat or 'failed' in cat or 'critical' in cat or 'high' in cat:
            bg_color = '#FEE2E2'
            text_color = '#991B1B'

        p_style = ParagraphStyle(
            'BadgeText',
            parent=style,
            alignment=1,
            fontSize=8.5,
            leading=10,
            textColor=colors.HexColor(text_color)
        )
        p = Paragraph(f"<b>{text.upper()}</b>", p_style)
        
        t = Table([[p]], colWidths=[90])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(bg_color)),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor(text_color)),
        ]))
        return t

    @classmethod
    async def generate_pdf_report(cls, db: AsyncSession, repo_id: UUID) -> bytes:
        repo = await repository_repo.get(db, repo_id)
        if not repo:
            raise ValueError(f"Repository with ID {repo_id} not found")

        latest_analysis = None
        if repo.analyses:
            sorted_analyses = sorted(repo.analyses, key=lambda a: a.created_at, reverse=True)
            latest_analysis = sorted_analyses[0]

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=54,
            rightMargin=54,
            topMargin=54,
            bottomMargin=54
        )
        
        styles = cls._get_styles()
        story = []
        
        # PAGE 1: COVER
        story.append(Spacer(1, 40))
        story.append(Paragraph("AI-POWERED AUDIT REPORT", ParagraphStyle('CoverPre', parent=styles['body_bold'], fontSize=11, textColor=colors.HexColor('#6366F1'), alignment=1, spaceAfter=10)))
        story.append(Paragraph("Repository Intelligence &amp;<br/>Survivability Analysis", styles['title']))
        story.append(Paragraph("Comprehensive diagnostic report and AI remediation recommendations.", styles['subtitle']))
        story.append(Spacer(1, 30))
        
        meta_data = [
            [cls._cell("Repository Name", styles['body_bold']), cls._cell(repo.name, styles['body'])],
            [cls._cell("Owner", styles['body_bold']), cls._cell(repo.owner, styles['body'])],
            [cls._cell("Clone URL", styles['body_bold']), cls._cell(repo.clone_url, styles['body'])],
            [cls._cell("Generated On", styles['body_bold']), cls._cell(datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'), styles['body'])],
        ]
        meta_table = Table(meta_data, colWidths=[150, 337])
        meta_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F8FAFC')),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(meta_table)
        story.append(PageBreak())

        if not latest_analysis:
            story.append(Paragraph("Analysis Report Summary", styles['section']))
            story.append(Paragraph("No analysis data available.", styles['body']))
            doc.build(story, canvasmaker=NumberedCanvas)
            return buffer.getvalue()

        findings = latest_analysis.findings or {}
        intel = findings.get("intelligence") or {}
        surv_details = findings.get("survivability_details") or {}
        health_pred = findings.get("health_prediction") or {}

        # 1. Executive Summary & Repository Grade
        story.append(Paragraph("1. Executive Summary & Repository Grade", styles['section']))
        
        repo_grade = intel.get("repository_grade", {})
        grade_val = repo_grade.get("grade", "N/A")
        grade_exp = repo_grade.get("explanation", "Not analyzed.")
        
        story.append(Paragraph(grade_exp, styles['body']))
        story.append(Spacer(1, 10))
        
        score_data = [
            [cls._cell("Composite Grade", styles['body_bold']), cls._make_badge(grade_val, grade_val, styles['body'])],
            [cls._cell("Reproducibility Score", styles['body_bold']), cls._cell(f"{latest_analysis.reproducibility_score or 0.0} / 100", styles['body'])],
            [cls._cell("Survivability Score", styles['body_bold']), cls._cell(f"{latest_analysis.survivability_score or 0.0} / 100", styles['body'])],
        ]
        score_table = Table(score_data, colWidths=[180, 307])
        score_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F8FAFC')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(score_table)
        
        # 1B. Reproducibility Score Breakdown
        rep_factors = findings.get("reproducibility_factors", {})
        breakdown = rep_factors.get("breakdown", [])
        if breakdown:
            story.append(Spacer(1, 20))
            story.append(Paragraph("Reproducibility Score Breakdown", styles['section']))
            
            breakdown_data = [[
                cls._cell("Category", styles['body_bold']), 
                cls._cell("Score", styles['body_bold']), 
                cls._cell("Explanation", styles['body_bold'])
            ]]
            
            for item in breakdown:
                breakdown_data.append([
                    cls._cell(item.get("category", ""), styles['body']),
                    cls._cell(f"{item.get('score', 0)} / {item.get('max', 0)}", styles['body']),
                    cls._cell(item.get("reason", ""), styles['body'])
                ])
                
            breakdown_table = Table(breakdown_data, colWidths=[130, 60, 297])
            breakdown_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(breakdown_table)
            
        # 1C. Survivability Score Breakdown
        surv_factors = findings.get("survivability_factors", {})
        surv_breakdown = surv_factors.get("breakdown", [])
        if surv_breakdown:
            story.append(Spacer(1, 20))
            story.append(Paragraph("Survivability Score Breakdown", styles['section']))
            
            confidence = surv_factors.get("confidence_score", 0)
            story.append(Paragraph(f"<b>Model Confidence:</b> {confidence}%", styles['body']))
            story.append(Spacer(1, 10))
            
            s_breakdown_data = [[
                cls._cell("Category", styles['body_bold']), 
                cls._cell("Score", styles['body_bold']), 
                cls._cell("Explanation", styles['body_bold'])
            ]]
            
            for item in surv_breakdown:
                s_breakdown_data.append([
                    cls._cell(item.get("category", ""), styles['body']),
                    cls._cell(f"{item.get('score', 0)} / {item.get('max', 0)}", styles['body']),
                    cls._cell(item.get("reason", ""), styles['body'])
                ])
                
            s_breakdown_table = Table(s_breakdown_data, colWidths=[130, 60, 297])
            s_breakdown_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(s_breakdown_table)
        
        # 2. Architecture Intelligence
        story.append(Spacer(1, 20))
        story.append(Paragraph("2. Architecture Intelligence", styles['section']))
        
        arch = intel.get("architecture") or {}
        story.append(Paragraph(arch.get("assessment", "") or "", styles['body']))
        
        arch_data = [
            [cls._cell("Detected Pattern", styles['body_bold']), cls._cell(arch.get("architecture_type", "Unknown"), styles['body'])],
            [cls._cell("Confidence", styles['body_bold']), cls._cell(f"{arch.get('confidence', 0)}%", styles['body'])],
        ]
        arch_table = Table(arch_data, colWidths=[180, 307])
        arch_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F8FAFC')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(arch_table)
        
        evidence = arch.get("evidence", [])
        if evidence:
            story.append(Spacer(1, 10))
            story.append(Paragraph("Architecture Evidence:", styles['body_bold']))
            for ev in evidence:
                story.append(Paragraph(f"• {ev}", styles['body']))

        story.append(PageBreak())

        # 3. Execution Guide
        story.append(Paragraph("3. Repository Execution Guide", styles['section']))
        guide = intel.get("execution_guide") or {}
        steps = guide.get("steps") or []
        if not steps:
            story.append(Paragraph("No execution guide available.", styles['body']))
        else:
            for stepItem in steps:
                story.append(Paragraph(f"<b>Step {stepItem.get('step')}: {stepItem.get('title')}</b>", styles['body']))
                desc = stepItem.get("description", "")
                if desc:
                    story.append(Paragraph(desc, styles['body']))
                story.append(Paragraph(stepItem.get("command", "").replace("\n", "<br/>").replace("\r", ""), styles['code']))

        # 4. Dependency Intelligence
        story.append(Spacer(1, 20))
        story.append(Paragraph("4. Dependency Intelligence", styles['section']))
        dep_crit = intel.get("dependency_criticality") or {}
        story.append(Paragraph(dep_crit.get("summary") or "", styles['body']))
        
        top_deps = dep_crit.get("top_critical_dependencies") or []
        if top_deps:
            story.append(Spacer(1, 10))
            dep_grid = [[cls._cell("Package", styles['body_bold']), cls._cell("Risk Level", styles['body_bold']), cls._cell("Impact if Removed", styles['body_bold'])]]
            for d in top_deps:
                dep_grid.append([
                    cls._cell(d.get("name", ""), styles['body']),
                    cls._make_badge(d.get("risk", ""), d.get("risk", ""), styles['body']),
                    cls._cell(d.get("impact_if_removed", ""), styles['body'])
                ])
            dep_table = Table(dep_grid, colWidths=[120, 80, 287])
            dep_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(dep_table)

        story.append(PageBreak())

        # 5. Environment Intelligence
        story.append(Paragraph("5. Environment Intelligence", styles['section']))
        env_intel = intel.get("environment_intelligence") or {}
        
        env_data = [
            [cls._cell("Completeness", styles['body_bold']), cls._cell(f"{env_intel.get('completeness_percentage') or 0}%", styles['body'])],
            [cls._cell("Template Quality", styles['body_bold']), cls._make_badge(env_intel.get("template_quality") or "Unknown", env_intel.get("template_quality") or "Unknown", styles['body'])],
        ]
        env_table = Table(env_data, colWidths=[180, 307])
        env_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F8FAFC')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(env_table)
        
        req_vars = env_intel.get("required_variables") or []
        mis_vars = env_intel.get("missing_variables") or []
        
        if req_vars:
            req_vars_str = ', '.join(str(v) for v in req_vars if v is not None)
            story.append(Spacer(1, 10))
            story.append(Paragraph(f"<b>Required Variables ({len(req_vars)}):</b> {req_vars_str}", styles['body']))
        if mis_vars:
            mis_vars_str = ', '.join(str(v) for v in mis_vars if v is not None)
            story.append(Spacer(1, 10))
            story.append(Paragraph(f"<b><font color='red'>Missing Variables ({len(mis_vars)}):</font></b> {mis_vars_str}", styles['body']))

        # 6. Build Validation & Failure Diagnosis
        story.append(Spacer(1, 20))
        story.append(Paragraph("6. Build Validation & Diagnosis", styles['section']))
        build = repo.build_result if isinstance(repo.build_result, dict) else {}
        b_succ = build.get("build_success", False)
        status_text = "SUCCESSFUL" if b_succ else "FAILED / SKIPPED"
        
        val_cat = build.get("validation_category", "UNKNOWN")
        b_data = [
            [cls._cell("Build Status", styles['body_bold']), cls._make_badge(status_text, "success" if b_succ else "failed", styles['body'])],
            [cls._cell("Validation Category", styles['body_bold']), cls._make_badge(val_cat, "success" if "SUCCESS" in val_cat else "failed", styles['body'])],
            [cls._cell("Maturity Score", styles['body_bold']), cls._cell(f"{build.get('build_maturity_score') or 0} / 100", styles['body_bold'])],
            [cls._cell("1. Dependencies", styles['body_bold']), cls._make_badge("PASS" if build.get("dependency_success") else "FAIL/SKIP", "success" if build.get("dependency_success") else "failed", styles['body'])],
            [cls._cell("2. Compilation", styles['body_bold']), cls._make_badge("PASS" if build.get("compilation_success") else "FAIL/SKIP", "success" if build.get("compilation_success") else "failed", styles['body'])],
            [cls._cell("3. Testing", styles['body_bold']), cls._make_badge("PASS" if build.get("test_success") else "FAIL/SKIP", "success" if build.get("test_success") else "failed", styles['body'])],
            [cls._cell("4. Runtime", styles['body_bold']), cls._make_badge("PASS" if build.get("runtime_success") else "FAIL/SKIP", "success" if build.get("runtime_success") else "failed", styles['body'])],
            [cls._cell("Detected Ecosystem", styles['body_bold']), cls._cell(build.get("detected_ecosystem") or "Unknown", styles['body'])],
            [cls._cell("Execution Time", styles['body_bold']), cls._cell(f"{build.get('execution_time') or 0}s", styles['body'])],
        ]
        b_table = Table(b_data, colWidths=[180, 307])
        b_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F8FAFC')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(b_table)
        
        diagnosis = repo.failure_diagnosis if isinstance(repo.failure_diagnosis, dict) else {}
        if not b_succ and diagnosis:
            story.append(Spacer(1, 10))
            story.append(Paragraph("Failure Diagnosis", styles['subsection']))
            story.append(Paragraph(f"<b>Error Classification:</b> {diagnosis.get('error_classification') or 'Unknown'}", styles['body']))
            story.append(Paragraph(f"<b>Root Cause:</b> {diagnosis.get('root_cause') or 'Unknown'}", styles['body']))

        story.append(PageBreak())

        # 7. Vulnerability Intelligence
        story.append(PageBreak())
        story.append(Paragraph("7. Vulnerability Intelligence", styles['section']))
        vuln = repo.vulnerability_profile if isinstance(repo.vulnerability_profile, dict) else {}
        if not vuln:
            story.append(Paragraph("No vulnerability data available.", styles['body']))
        else:
            v_data = [
                [cls._cell("Security Score", styles['body_bold']), cls._cell(f"{vuln.get('security_score', 0)} / 100", styles['body_bold'])],
                [cls._cell("Average CVSS", styles['body_bold']), cls._cell(str(vuln.get('average_cvss', 0.0)), styles['body'])],
                [cls._cell("Critical Vulns", styles['body_bold']), cls._cell(str(vuln.get('critical', 0)), styles['body'])],
                [cls._cell("High Vulns", styles['body_bold']), cls._cell(str(vuln.get('high', 0)), styles['body'])],
                [cls._cell("Total Vulns", styles['body_bold']), cls._cell(str(vuln.get('total_vulnerabilities', 0)), styles['body'])],
            ]
            v_table = Table(v_data, colWidths=[180, 307])
            v_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F8FAFC')),
                ('PADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(v_table)
            
            recs = vuln.get("recommendations", [])
            if recs:
                story.append(Spacer(1, 10))
                story.append(Paragraph("Recommendations", styles['subsection']))
                for rec in recs:
                    story.append(Paragraph(f"• {rec}", styles['body']))

        story.append(Spacer(1, 20))

        # 8. AI Recommendations & Repository Reasoning
        story.append(Paragraph("8. AI Repository Reasoning", styles['section']))
        reasoning = intel.get("repository_reasoning") or {}
        
        def render_reasoning_list(title, items):
            if items:
                story.append(Paragraph(title, styles['subsection']))
                for item in items:
                    story.append(Paragraph(f"• {item}", styles['body']))
                    
        render_reasoning_list("Strengths", reasoning.get("strengths") or [])
        render_reasoning_list("Weaknesses", reasoning.get("weaknesses") or [])
        render_reasoning_list("Risks", reasoning.get("risks") or [])
        render_reasoning_list("Observations", reasoning.get("observations") or [])

        # 9. Future Risk Forecast
        story.append(Spacer(1, 20))
        story.append(Paragraph("9. Future Risk Forecast", styles['section']))
        pred_health = health_pred.get("predicted_health") or "UNKNOWN"
        pred_reason = health_pred.get("reasoning") or ""
        pred_data = [
            [cls._cell("Predicted Trajectory", styles['body_bold']), cls._make_badge(pred_health, pred_health, styles['body'])],
            [cls._cell("AI Reasoning", styles['body_bold']), cls._cell(pred_reason, styles['body'])],
        ]
        pred_table = Table(pred_data, colWidths=[120, 367])
        pred_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F8FAFC')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(pred_table)

        # 10. Action Plan
        story.append(Spacer(1, 20))
        story.append(Paragraph("10. Action Plan", styles['section']))
        readiness = intel.get("deployment_readiness") or {}
        recs = readiness.get("recommendations") or []
        if not isinstance(recs, list):
            recs = [recs] if recs else []
            
        diag_recs = diagnosis.get("recommendations")
        if diag_recs:
            if isinstance(diag_recs, list):
                recs = [f"CRITICAL: {r}" for r in diag_recs] + recs
            else:
                recs.insert(0, f"CRITICAL: {diag_recs}")
            
        if recs:
            for i, r in enumerate(recs, 1):
                story.append(Paragraph(f"<b>{i}.</b> {r}", styles['body']))
        else:
            story.append(Paragraph("No major action items identified. Repository is healthy.", styles['body']))

        doc.build(story, canvasmaker=NumberedCanvas)
        return buffer.getvalue()

