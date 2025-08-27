import React from 'react';
import { FaDownload, FaShieldAlt, FaCheck } from 'react-icons/fa';
import './styles.css';

const Home = () => {
  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <h1><FaShieldAlt className="shield-icon" /> Secure Shield: Healthcare Data Protection</h1>
          <p className="header-subtitle">
            Safeguard your patient records with our HIPAA-compliant medical document redaction and PII protection solution.
          </p>
        </div>
      </header>

      <div className="home-content">
        <section className="hero-section">
          <h2>Protect Patient Data, Advance Medical Research</h2>
          <p>
            In today's healthcare environment, protecting sensitive patient information is both a legal requirement and ethical 
            imperative. Secure Shield empowers healthcare providers and research institutions to harness the full potential of 
            medical data while ensuring HIPAA compliance and patient privacy protection.
          </p>
        </section>

        <section className="benefits-section">
          <h2>Why Choose Secure Shield for Healthcare?</h2>
          <div className="benefits-list">
            <div className="benefit-item">
              <FaCheck className="check-icon" /> <span>Medical-Grade Accuracy: AI-powered detection specialized for healthcare PHI and PII</span>
            </div>
            <div className="benefit-item">
              <FaCheck className="check-icon" /> <span>PDF Optimization: Process thousands of medical PDFs and EMR records quickly</span>
            </div>
            <div className="benefit-item">
              <FaCheck className="check-icon" /> <span>Clinical Integration: Seamlessly works with your existing healthcare systems and workflows</span>
            </div>
            <div className="benefit-item">
              <FaCheck className="check-icon" /> <span>Medical-Specific Protection: Redaction tailored to patient records and clinical documents</span>
            </div>
            <div className="benefit-item">
              <FaCheck className="check-icon" /> <span>HIPAA-Compliant Audit Trail: Comprehensive logging for healthcare regulatory compliance</span>
            </div>
          </div>
        </section>

        <section className="testimonial-section">
          <h2>Trusted by Healthcare Leaders</h2>
          <div className="testimonial">
            <blockquote>
              "Secure Shield has revolutionized our patient record management. We've streamlined HIPAA compliance 
              while significantly improving our research data security and accessibility."
            </blockquote>
            <cite>- Dr. Sarah Johnson, CMIO, Metropolitan Medical Center</cite>
          </div>
        </section>

        <section className="features-section">
          <h2>Key Features for Healthcare</h2>
          <ul className="features-list">
            <li>Medical PDF Processing: Specialized handling for clinical records, discharge summaries, and medical reports</li>
            <li>Healthcare PII Detection: Advanced AI identifies patient identifiers, MRNs, insurance details, and 100+ PHI types</li>
            <li>Flexible Redaction: Choose from masking, encryption, or complete removal while preserving medical data integrity</li>
            <li>Clinical Document Integrity: Maintain document structure for medical research and analysis</li>
            <li>Real-time Monitoring: Track processing status of patient records with detailed audit trails</li>
            <li>Role-Based Access: Granular controls for clinicians, researchers, and administrators</li>
          </ul>
        </section>

        <section className="trial-section">
          <h2>Experience Secure Shield for Healthcare Today</h2>
          <p>
            Ready to see how Secure Shield can transform your medical data protection strategy? Get started with our no-risk trial:
          </p>
          <ol className="trial-steps">
            <li>Download our sample medical document set (HIPAA-compliant anonymized records)</li>
            <li>Upload to our secure healthcare-grade processing portal</li>
            <li>Witness the power of medical-specific intelligent redaction in action</li>
          </ol>
          <a 
            href={process.env.PUBLIC_URL + "/documents.zip"} 
            className="download-button"
          >
            <FaDownload className="download-icon" /> Start Free Trial
          </a>
        </section>

        <section className="compliance-section">
          <h2>Healthcare Compliance Made Easy</h2>
          <p>
            Stay ahead of healthcare regulations including HIPAA, HITECH, 42 CFR Part 2, and more. Our solution is specifically designed 
            for medical data protection and continually updated to meet the latest healthcare compliance standards and best practices.
          </p>
        </section>

        <section className="how-it-works-section">
          <h2>How It Works for Medical PDFs</h2>
          <p>
            Secure Shield leverages cutting-edge AWS healthcare-optimized technologies:
          </p>
          <ol className="how-it-works-steps">
            <li>Advanced OCR extracts text from medical PDFs with clinical-grade accuracy</li>
            <li>Healthcare-trained AI identifies patient identifiers and sensitive medical information</li>
            <li>Medical-specific rules apply your exact healthcare privacy policies</li>
            <li>Redacted medical documents retain their clinical value for research and analysis</li>
            <li>Detailed HIPAA-compliant audit trails provide full visibility into the protection process</li>
          </ol>

        </section>

        <section className="deployment-section">
          <h2>Healthcare-Ready Deployment Options</h2>
          <ul className="deployment-options">
            <li>HIPAA-Compliant Cloud: Fully managed healthcare-grade SaaS solution</li>
            <li>Hybrid Healthcare: Integrate with your on-premises hospital systems and EMRs</li>
            <li>Private Medical Cloud: Deploy in your own HIPAA-eligible AWS environment</li>
          </ul>
        </section>

        <section className="benefits-summary-section">
          <h2>Take Control of Your Patient Data</h2>
          <p>
            Don't let healthcare privacy concerns limit your medical research and operations. With Secure Shield, you can:
          </p>
          <ul className="benefits-summary-list">
            <li>Safely leverage patient data for medical analytics and clinical research</li>
            <li>Confidently share medical documents with partners, researchers, and regulators</li>
            <li>Streamline your HIPAA compliance processes</li>
            <li>Protect patient trust and your institution from costly healthcare data breaches</li>
          </ul>
        </section>

        <section className="call-to-action-section">
          <h2>Ready to Shield Your Healthcare Organization?</h2>
          <p>
            Contact our healthcare solutions team today for a personalized demo and discover how Secure Shield can 
            protect your patient data while enabling advanced medical research and analytics.
          </p>
          <button className="cta-button" onClick={() => window.location.href = "/process"}>
            Try It Now
          </button>
        </section>
      </div>
    </div>
  );
};

export default Home
