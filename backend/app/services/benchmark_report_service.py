import io
import logging
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.benchmark import BenchmarkRun, BenchmarkResult

logger = logging.getLogger(__name__)

class BenchmarkReportService:
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
        
        body_style = ParagraphStyle(
            'BodyText',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#334155'),
            spaceAfter=6
        )

        return {'title': title_style, 'section': section_title_style, 'body': body_style}

    @classmethod
    def generate_pdf(cls, run: BenchmarkRun, results: list[BenchmarkResult]) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54,
            title="SaaS Benchmark Report",
            author="AEGIS Platform"
        )
        
        styles = cls._get_styles()
        story = []

        # 1. Cover
        story.append(Spacer(1, 100))
        story.append(Paragraph("Aegis Platform", styles['body']))
        story.append(Paragraph("Repository Benchmarking Framework Report", styles['title']))
        story.append(Spacer(1, 20))
        story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC", styles['body']))
        story.append(Paragraph(f"Run ID: {run.id}", styles['body']))
        story.append(Paragraph(f"Status: {run.status.upper()}", styles['body']))
        story.append(PageBreak())

        # 2. Executive Summary
        story.append(Paragraph("1. Executive Summary", styles['section']))
        story.append(Paragraph(
            "This report details the execution and accuracy results of the AEGIS Analysis Pipeline against "
            "a ground-truth dataset of 15 repositories spanning Python, Node.js, Java, Go, and Rust. "
            "The framework measures the system's ability to accurately detect technologies, "
            "parse dependencies, reconstruct environments, successfully validate builds, and evaluate documentation.",
            styles['body']
        ))
        
        story.append(Spacer(1, 15))
        
        metrics_data = [
            ["Metric", "Accuracy Rate (%)"],
            ["Technology Detection Accuracy", f"{run.tech_accuracy}%"],
            ["Dependency Detection Accuracy", f"{run.dependency_accuracy}%"],
            ["Environment Config Detection Accuracy", f"{run.environment_accuracy}%"],
            ["Build Validation Success Rate Accuracy", f"{run.build_accuracy}%"],
            ["Documentation Parsing Accuracy", f"{run.docs_accuracy}%"]
        ]
        
        t = Table(metrics_data, colWidths=[300, 150])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(t)
        
        story.append(Spacer(1, 20))
        
        # 3. Individual Repository Results
        story.append(Paragraph("2. Individual Repository Evaluation", styles['section']))
        
        for r in results:
            story.append(Paragraph(f"Repository: {r.repo_url}", styles['body']))
            
            repo_data = [
                ["Capability", "Expected", "Predicted", "Match"],
                ["Ecosystem", r.expected_ecosystem, str(r.predicted_ecosystem), "PASS" if r.tech_match else "FAIL"],
                ["Dependencies", str(r.expected_has_deps), str(r.predicted_has_deps), "PASS" if r.dep_match else "FAIL"],
                ["Environment (.env)", str(r.expected_has_env), str(r.predicted_has_env), "PASS" if r.env_match else "FAIL"],
                ["Build Success", str(r.expected_build_success), str(r.predicted_build_success), "PASS" if r.build_match else "FAIL"],
                ["Documentation", str(r.expected_has_readme), str(r.predicted_has_readme), "PASS" if r.docs_match else "FAIL"],
            ]
            
            rt = Table(repo_data, colWidths=[130, 100, 100, 100])
            rt.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                ('PADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(rt)
            story.append(Spacer(1, 15))

        # Build Document
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes

benchmark_report_service = BenchmarkReportService()
