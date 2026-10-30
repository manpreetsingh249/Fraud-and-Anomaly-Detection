import os
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from backend.app.core.config import settings

class ReportService:
    @staticmethod
    def export_csv(results: List[Dict[str, Any]], filename_prefix: str = "analysis_results") -> Path:
        """Exports transaction analysis results to CSV."""
        settings.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filepath = settings.REPORTS_DIR / f"{filename_prefix}_{timestamp}.csv"
        
        df = pd.DataFrame(results)
        df.to_csv(filepath, index=False)
        return filepath

    @staticmethod
    def generate_pdf_report(
        run_data: Dict[str, Any],
        eval_data: Dict[str, Any],
        output_filename: str = "fraud_detection_report.pdf"
    ) -> Path:
        """
        Generates a concise, formal academic audit report in PDF format using ReportLab.
        """
        settings.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filepath = settings.REPORTS_DIR / f"{output_filename.replace('.pdf', '')}_{timestamp}.pdf"

        doc = SimpleDocTemplate(
            str(filepath),
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )
        story = []
        styles = getSampleStyleSheet()

        # Custom Styles
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#1E293B'),
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#64748B'),
            spaceAfter=15
        )
        h2_style = ParagraphStyle(
            'Heading2Custom',
            parent=styles['Heading2'],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#0F172A'),
            spaceBefore=12,
            spaceAfter=8
        )
        body_style = ParagraphStyle(
            'BodyCustom',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#334155'),
            spaceAfter=6
        )

        # Header
        story.append(Paragraph("Financial Fraud & Anomaly Detection Audit Report", title_style))
        story.append(Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Academic Project Demonstration", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563EB'), spaceAfter=15))

        # Section 1: Analysis Run Overview
        story.append(Paragraph("1. Transaction Batch Summary", h2_style))
        summary_table_data = [
            ["Metric", "Value", "Metric", "Value"],
            ["Total Analyzed", f"{run_data.get('total_records', 0):,}", "Supervised Model", str(run_data.get('supervised_model', 'N/A'))],
            ["Predicted Fraud", f"{run_data.get('fraud_detected_count', 0)} ({run_data.get('fraud_percentage', 0)}%)", "Detected Anomalies", f"{run_data.get('anomaly_detected_count', 0)} ({run_data.get('anomaly_percentage', 0)}%)"],
            ["High Risk Cases", f"{run_data.get('risk_counts', {}).get('High', 0)}", "Medium Risk Cases", f"{run_data.get('risk_counts', {}).get('Medium', 0)}"],
        ]
        t1 = Table(summary_table_data, colWidths=[130, 130, 130, 130])
        t1.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1E293B')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ]))
        story.append(t1)
        story.append(Spacer(1, 15))

        # Section 2: Machine Learning Evaluation Metrics
        story.append(Paragraph("2. Model Evaluation Comparison", h2_style))
        story.append(Paragraph(
            "Evaluation metrics measured strictly on held-out test data (leak-free split with RobustScaler fitted only on training set).",
            body_style
        ))

        eval_rows = [["Model Name", "Type", "Precision", "Recall", "F1-Score", "PR-AUC / Outliers"]]
        for item in eval_data.get("evaluations", []):
            m_type = "Supervised" if item.get("is_supervised") else "Unsupervised"
            if item.get("is_supervised"):
                eval_rows.append([
                    item.get("model_name", "N/A"),
                    m_type,
                    f"{item.get('precision', 0):.3f}" if item.get('precision') is not None else "N/A",
                    f"{item.get('recall', 0):.3f}" if item.get('recall') is not None else "N/A",
                    f"{item.get('f1_score', 0):.3f}" if item.get('f1_score') is not None else "N/A",
                    f"{item.get('pr_auc', 0):.3f}" if item.get('pr_auc') is not None else "N/A"
                ])
            else:
                anom = item.get("anomaly_metrics") or {}
                eval_rows.append([
                    item.get("model_name", "Isolation Forest"),
                    m_type,
                    "N/A (Unsup.)",
                    "N/A (Unsup.)",
                    "N/A (Unsup.)",
                    f"{anom.get('anomalies_detected', 0)} ({anom.get('anomaly_percentage', 0)}%)"
                ])

        t2 = Table(eval_rows, colWidths=[150, 75, 75, 75, 75, 80])
        t2.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(t2)
        story.append(Spacer(1, 15))

        # Section 3: Academic Concept & Interpretation Notes
        story.append(Paragraph("3. Academic Principles & Limitations", h2_style))
        notes = [
            "<b>1. Distinction Between Fraud and Anomaly:</b> Supervised models detect learned patterns corresponding to known fraud vectors. Unsupervised anomaly detection (Isolation Forest) flags statistical outliers in feature space. An anomaly is an unusual transaction, NOT confirmed fraud, and requires human auditor review.",
            "<b>2. The Accuracy Fallacy:</b> Due to extreme class imbalance (~0.17% fraud in the Kaggle benchmark), overall accuracy is deceptive. A dummy classifier predicting all legitimate transactions achieves ~99.8% accuracy. Precision, Recall, and PR-AUC serve as the true indicators of model efficacy.",
            "<b>3. Deployment Scope:</b> This application is built as an academic BCA research prototype and is not intended as an autonomous production payment gateway."
        ]
        for note in notes:
            story.append(Paragraph(note, body_style))
            story.append(Spacer(1, 4))

        doc.build(story)
        return filepath

report_service = ReportService()
