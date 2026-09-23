import React, { useState } from 'react';
import {
  X, Printer, FileText, Download, Shield, User, Scale,
  Building, Calendar, Clock, Check, AlertCircle, Eye, Fingerprint
} from 'lucide-react';
import { PDL } from '../../types';

interface OfficialBjmpDocumentsModalProps {
  pdlList: PDL[];
  selectedPdl: PDL | null;
  onClose: () => void;
}

type DocType =
  | 'COMMITMENT_REGISTER'
  | 'BOOKING_REPORT'
  | 'CERTIFICATE_OF_DETENTION'
  | 'PROPERTY_RECEIPT'
  | 'MANIPESTO_GCTA'
  | 'RECORD_JACKET'
  | 'BERTILLION_BODY_CHART'
  | 'PALM_FINGERPRINT_RECORD'
  | 'CERTIFICATE_OF_DISCHARGE'
  | 'RELEASE_REGISTER';

export const OfficialBjmpDocumentsModal: React.FC<OfficialBjmpDocumentsModalProps> = ({
  pdlList,
  selectedPdl: initialPdl,
  onClose,
}) => {
  const [currentPdlId, setCurrentPdlId] = useState<string>(
    initialPdl?.id || (pdlList[0]?.id ?? '')
  );
  const [activeDocType, setActiveDocType] = useState<DocType>('BOOKING_REPORT');
  const [selectedMonth, setSelectedMonth] = useState('January 2025');

  const currentPdl = pdlList.find((p) => p.id === currentPdlId) || pdlList[0];

  const handlePrint = () => {
    window.print();
  };

  // Male & Female Counts for Commitment Register (Photo 1 & 2)
  const maleCount = pdlList.filter((p) => p.sex === 'Male' || !p.sex).length;
  const femaleCount = pdlList.filter((p) => p.sex === 'Female').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[95vh]">
        
        {/* Header Bar */}
        <div className="bg-slate-950 border-b border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                Official BJMP Calabarzon Region Records
              </div>
              <h3 className="text-base font-bold text-white">
                BJMP Imus City Jail — Official Document & Register Generator
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Document</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Selection Strip: Inmate selector + Document Switcher */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Document Type Selector */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-xs">
            {[
              { id: 'BOOKING_REPORT', label: '1. Booking Report' },
              { id: 'CERTIFICATE_OF_DETENTION', label: '2. Certificate of Detention' },
              { id: 'PROPERTY_RECEIPT', label: '3. Property Receipt' },
              { id: 'MANIPESTO_GCTA', label: '4. Manipesto ng Detenido (GCTA)' },
              { id: 'RECORD_JACKET', label: '5. Record Jacket / Case Profile' },
              { id: 'BERTILLION_BODY_CHART', label: '6. Bertillion Body Chart' },
              { id: 'COMMITMENT_REGISTER', label: '7. Monthly Register (All PDLs)' },
              { id: 'PALM_FINGERPRINT_RECORD', label: '8. Palm / Fingerprint Record' },
              { id: 'CERTIFICATE_OF_DISCHARGE', label: '9. Certificate of Discharge' },
              { id: 'RELEASE_REGISTER', label: '10. Release Register' },
            ].map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setActiveDocType(doc.id as DocType)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeDocType === doc.id
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {doc.label}
              </button>
            ))}
          </div>

          {/* Active PDL selector (when not in full commitment register mode) */}
          {activeDocType !== 'COMMITMENT_REGISTER' && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 font-semibold">Select Inmate:</span>
              <select
                value={currentPdlId}
                onChange={(e) => setCurrentPdlId(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 font-semibold focus:outline-none focus:border-amber-400"
              >
                {pdlList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.pdlNumber})
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeDocType === 'COMMITMENT_REGISTER' && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 font-semibold">Month & Year:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 font-semibold focus:outline-none focus:border-amber-400"
              >
                <option value="January 2025">January 2025</option>
                <option value="February 2025">February 2025</option>
                <option value="March 2025">March 2025</option>
                <option value="August 2024">August 2024</option>
                <option value="June 2024">June 2024</option>
                <option value="March 2024">March 2024</option>
              </select>
            </div>
          )}

        </div>

        {/* Printable Official Document Canvas (Styled as official BJMP Paperwork) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/90 flex justify-center">
          
          <div className="w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-10 font-sans border border-slate-300 print:border-none print:shadow-none print:m-0 print:p-0 print:w-full">
            
            {/* Standard BJMP Official Header (Photos 3, 4, 10, 11) */}
            <div className="text-center border-b-2 border-slate-900 pb-3 mb-5">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 flex items-center justify-center">
                  {/* BJMP Calabarzon Emblem Placeholder */}
                  <div className="w-14 h-14 rounded-full border-2 border-slate-800 bg-amber-50 flex items-center justify-center text-[10px] font-black text-slate-800 uppercase text-center p-1 leading-tight">
                    BJMP R-4A
                  </div>
                </div>

                <div className="flex-1 text-center px-2">
                  <div className="text-[11px] uppercase tracking-widest text-slate-700 font-serif">Republic of the Philippines</div>
                  <div className="text-[11px] uppercase tracking-widest text-slate-700 font-serif">Department of the Interior and Local Government</div>
                  <div className="text-xs uppercase tracking-wider font-extrabold text-slate-950 font-serif">BUREAU OF JAIL MANAGEMENT AND PENOLOGY</div>
                  <div className="text-[11px] uppercase font-bold text-slate-800">CALABARZON REGION</div>
                  <div className="text-sm font-black tracking-wide text-slate-900 uppercase">
                    IMUS CITY JAIL - MALE DORMITORY
                  </div>
                  <div className="text-[10px] text-slate-600">
                    Cavite Civic Center, Palico IV, Imus City, Cavite | Tel: (046) 472-3671 / +63 923-426-3892
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    Email: r4a.imuscjmd@bjmp.gov.ph | ISO 9001:2015 Certified
                  </div>
                </div>

                <div className="w-16 h-16 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full border-2 border-slate-800 bg-blue-50 flex items-center justify-center text-[10px] font-black text-slate-800 uppercase text-center p-1 leading-tight">
                    IMUS CITY
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================
                DOCUMENT 1: JAIL BOOKING REPORT (Photos 4 & 5)
            ======================================================== */}
            {activeDocType === 'BOOKING_REPORT' && currentPdl && (
              <div className="space-y-4 text-[11px]">
                <div className="text-center font-black uppercase text-base tracking-wider bg-slate-900 text-white py-1.5 rounded">
                  JAIL BOOKING REPORT
                </div>

                <div className="flex items-start justify-between border-b border-slate-300 pb-2">
                  <div>
                    <span className="font-bold">Date of This Report:</span>{' '}
                    <span className="font-mono">{currentPdl.dateCommitted || '2025-01-15'}</span>
                  </div>
                  <div>
                    <span className="font-bold">Prisoner's No.:</span>{' '}
                    <span className="font-mono font-bold text-sm bg-slate-100 px-2 py-0.5 border border-slate-400 rounded">
                      {currentPdl.pdlNumber}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold">Date Filed:</span>{' '}
                    <span className="font-mono">{currentPdl.dateCommitted || '2025-01-15'}</span>
                  </div>
                </div>

                {/* Top Section: Photo slot & Core Demographics */}
                <div className="grid grid-cols-4 gap-3 border border-slate-800 p-2.5 rounded">
                  
                  {/* Photo Area */}
                  <div className="col-span-1 border-2 border-dashed border-slate-400 h-36 flex flex-col items-center justify-center bg-slate-50 text-slate-500 text-center p-2 rounded">
                    <User className="w-8 h-8 text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold uppercase">2 x 2 Recent Photo</span>
                    <span className="text-[8px] text-slate-400">White Background</span>
                    <span className="text-[8px] font-mono mt-1 text-slate-700">{currentPdl.pdlNumber}</span>
                  </div>

                  {/* Demographic Fields */}
                  <div className="col-span-3 grid grid-cols-3 gap-2 text-[10px]">
                    <div className="col-span-2">
                      <span className="font-bold block text-slate-600">FULL LEGAL NAME:</span>
                      <span className="font-bold text-xs uppercase">{currentPdl.fullName}</span>
                    </div>
                    <div>
                      <span className="font-bold block text-slate-600">ALIAS / NICKNAME:</span>
                      <span>{currentPdl.aliases || 'None'}</span>
                    </div>

                    <div>
                      <span className="font-bold block text-slate-600">SEX:</span>
                      <span>{currentPdl.sex || 'Male'}</span>
                    </div>
                    <div>
                      <span className="font-bold block text-slate-600">AGE AT ADMISSION:</span>
                      <span>{currentPdl.ageAtAdmission || '32'} y/o</span>
                    </div>
                    <div>
                      <span className="font-bold block text-slate-600">DATE OF BIRTH:</span>
                      <span className="font-mono">{currentPdl.dateOfBirth || '1992-04-15'}</span>
                    </div>

                    <div>
                      <span className="font-bold block text-slate-600">CIVIL STATUS:</span>
                      <span>{currentPdl.civilStatus || 'Married'}</span>
                    </div>
                    <div>
                      <span className="font-bold block text-slate-600">CITIZENSHIP:</span>
                      <span>{currentPdl.citizenship || 'Filipino'}</span>
                    </div>
                    <div>
                      <span className="font-bold block text-slate-600">RELIGION:</span>
                      <span>{currentPdl.religion || 'Roman Catholic'}</span>
                    </div>

                    <div className="col-span-3">
                      <span className="font-bold block text-slate-600">PRESENT ADDRESS:</span>
                      <span>{currentPdl.presentAddress || 'Imus City, Cavite'}</span>
                    </div>

                    <div className="col-span-3">
                      <span className="font-bold block text-slate-600">PROVINCIAL ADDRESS:</span>
                      <span>{currentPdl.provincialAddress || 'None'}</span>
                    </div>
                  </div>

                </div>

                {/* Physical & Bertillion / Gang Affiliation (Photo 4 & 5) */}
                <div className="border border-slate-800 p-2.5 rounded text-[10px] space-y-1.5">
                  <div className="font-bold uppercase text-slate-800 border-b border-slate-300 pb-1">
                    Physical Description, Bertillion (Tattoo) Marks & Gang Affiliation
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div><span className="font-bold text-slate-600">HEIGHT:</span> {currentPdl.height || '5\'7"'}</div>
                    <div><span className="font-bold text-slate-600">WEIGHT:</span> {currentPdl.weight || '68 kg'}</div>
                    <div><span className="font-bold text-slate-600">BUILT:</span> {currentPdl.built || 'Medium'}</div>
                    <div><span className="font-bold text-slate-600">COMPLEXION:</span> {currentPdl.complexion || 'Brown'}</div>
                    <div><span className="font-bold text-slate-600">EYES:</span> {currentPdl.eyes || 'Brown'}</div>
                    <div><span className="font-bold text-slate-600">HAIR:</span> {currentPdl.hair || 'Black'}</div>
                    <div><span className="font-bold text-slate-600">BLOOD TYPE:</span> {currentPdl.bloodType || 'O+'}</div>
                    <div><span className="font-bold text-slate-600">PANGKAT/GANG:</span> <span className="font-bold text-slate-950">{currentPdl.gangGroupAffiliation || 'Non-Affiliated'}</span></div>
                  </div>
                  <div className="pt-1">
                    <span className="font-bold text-slate-600">BERTILLION MARKS / SCARS / TATTOOS:</span>
                    <p className="bg-slate-50 p-1.5 rounded border border-slate-300 mt-0.5 font-medium">
                      {currentPdl.bertillionMarks || 'No permanent distinguishing scars or tattoos noted upon commitment.'}
                    </p>
                  </div>
                </div>

                {/* Social Background */}
                <div className="border border-slate-800 p-2.5 rounded text-[10px] grid grid-cols-3 gap-2">
                  <div><span className="font-bold text-slate-600">OCCUPATION:</span> {currentPdl.occupation || 'Worker'}</div>
                  <div><span className="font-bold text-slate-600">EDUCATION:</span> {currentPdl.highestEducationalAttainment || 'High School'}</div>
                  <div><span className="font-bold text-slate-600">SPOUSE:</span> {currentPdl.spouseName || 'None'}</div>
                  <div><span className="font-bold text-slate-600">FATHER:</span> {currentPdl.fatherName || 'N/A'}</div>
                  <div><span className="font-bold text-slate-600">MOTHER:</span> {currentPdl.motherName || 'N/A'}</div>
                  <div><span className="font-bold text-slate-600">EMERGENCY CONTACT:</span> {currentPdl.emergencyContactPerson} ({currentPdl.emergencyContactPhone})</div>
                </div>

                {/* Cases Table (Photo 4) */}
                <div className="border border-slate-800 rounded overflow-hidden">
                  <div className="bg-slate-100 font-bold uppercase p-1.5 text-[10px] border-b border-slate-800 flex justify-between">
                    <span>Criminal Cases Charged</span>
                    <span>Court & Presiding Judge</span>
                  </div>
                  <table className="w-full text-left text-[10px]">
                    <thead className="border-b border-slate-300 bg-slate-50">
                      <tr>
                        <th className="p-1.5">Criminal Case #</th>
                        <th className="p-1.5">Violation / Offense Charged</th>
                        <th className="p-1.5">Court / Branch</th>
                        <th className="p-1.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(currentPdl.cases || [
                        {
                          caseNumber: currentPdl.criminalCaseNumbers?.[0] || 'CC-24-10294',
                          offense: currentPdl.primaryOffense || 'Violation of RA 9165',
                          courtBranch: currentPdl.courtBranch || 'RTC Branch 20, Imus City',
                          caseStatus: currentPdl.caseStatus || 'Under Trial',
                        },
                      ]).map((c, i) => (
                        <tr key={i}>
                          <td className="p-1.5 font-mono font-bold">{c.caseNumber}</td>
                          <td className="p-1.5">{c.offense}</td>
                          <td className="p-1.5">{c.courtBranch}</td>
                          <td className="p-1.5 font-semibold">{c.caseStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Previous Records */}
                <div className="border border-slate-800 p-2 rounded text-[10px]">
                  <div className="font-bold text-slate-700">PREVIOUS CRIMINAL RECORDS / ARREST HISTORY:</div>
                  <p className="text-slate-600 italic">
                    {currentPdl.previousCriminalRecords?.length
                      ? currentPdl.previousCriminalRecords.map((pr) => `${pr.caseNumber} - ${pr.offense} (${pr.court}, Sentence: ${pr.sentence}, Released: ${pr.dateReleased})`).join('; ')
                      : 'None on official court database / First time offender.'}
                  </p>
                </div>

                {/* Signatures & Attestation (Photo 4 & 5) */}
                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-400">
                  <div className="text-center">
                    <div className="border-b border-slate-800 w-48 mx-auto h-8"></div>
                    <div className="font-bold uppercase text-[10px] mt-1">{currentPdl.fullName}</div>
                    <div className="text-[9px] text-slate-500">Signature of Accused / PDL</div>
                  </div>
                  <div className="text-center">
                    <div className="border-b border-slate-800 w-48 mx-auto h-8 flex items-end justify-center font-bold text-[10px]">
                      JO1 Aldrin M. Mangampo
                    </div>
                    <div className="font-bold uppercase text-[10px] mt-1">JO1 Aldrin M. Mangampo</div>
                    <div className="text-[9px] text-slate-500">Jail Booking Officer / Records Custodian</div>
                  </div>
                </div>

              </div>
            )}

            {/* ========================================================
                DOCUMENT 2: CERTIFICATE OF DETENTION (Photo 11)
            ======================================================== */}
            {activeDocType === 'CERTIFICATE_OF_DETENTION' && currentPdl && (
              <div className="space-y-6 text-xs leading-relaxed">
                
                <div className="text-center pt-2">
                  <h2 className="text-lg font-black uppercase tracking-widest font-serif text-slate-950 underline decoration-2 underline-offset-4">
                    CERTIFICATE OF DETENTION
                  </h2>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">Control Ref No: BJMP-COD-2025-{currentPdl.fileNumber || '042'}</p>
                </div>

                <div className="font-bold uppercase text-slate-900 tracking-wide text-xs">
                  TO WHOM IT MAY CONCERN:
                </div>

                <p className="text-justify indent-8 text-slate-800">
                  THIS IS TO CERTIFY that <strong className="uppercase underline">{currentPdl.fullName}</strong>, 
                  {' '}with Alias/A.K.A. <strong>"{currentPdl.aliases || 'N/A'}"</strong>, Filipino, 
                  {' '}born on <strong>{currentPdl.dateOfBirth || '1992-04-15'}</strong>, with File Number{' '}
                  <span className="font-mono font-bold">{currentPdl.fileNumber || 'FN-2024-0192'}</span>, 
                  is a bona fide <strong>Person Deprived of Liberty (PDL)</strong> currently detained in custody 
                  at the <strong>BJMP Imus City Jail - Male Dormitory</strong>, located at Cavite Civic Center, Imus City, Cavite.
                </p>

                <p className="text-justify indent-8 text-slate-800">
                  Records show that the subject PDL was committed to this institutional facility on{' '}
                  <strong className="underline">{currentPdl.dateCommitted || 'March 12, 2024'}</strong>{' '}
                  and has been detained continuously up to the present date, for the following criminal charge(s):
                </p>

                {/* Case Box */}
                <div className="bg-slate-50 border border-slate-400 p-3 rounded-lg space-y-1.5 my-3 text-[11px]">
                  <div>
                    <strong className="text-slate-700">OFFENSE/S CHARGED:</strong>{' '}
                    <span className="font-bold uppercase">{currentPdl.primaryOffense || 'Violation of R.A. 9165'}</span>
                  </div>
                  <div>
                    <strong className="text-slate-700">CRIMINAL CASE NO./S:</strong>{' '}
                    <span className="font-mono font-bold">{currentPdl.criminalCaseNumbers?.join(', ') || 'CC-24-10294'}</span>
                  </div>
                  <div>
                    <strong className="text-slate-700">COURT / BRANCH:</strong>{' '}
                    <span>{currentPdl.courtBranch || 'RTC Branch 20, Imus City, Cavite'}</span>
                  </div>
                  <div>
                    <strong className="text-slate-700">STATUS OF CASE:</strong>{' '}
                    <span className="font-semibold text-slate-900">{currentPdl.caseStatus || 'Under Trial'}</span>
                  </div>
                </div>

                <p className="text-justify indent-8 text-slate-800">
                  This certification is issued upon the request of the interested party or legal counsel 
                  for <strong>whatever legal purposes it may serve</strong> (Court proceedings, bail application, legal visitation clearance, or consular requirements).
                </p>

                <div className="pt-2 text-slate-800">
                  Done this <strong className="underline">{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> at BJMP Imus City Jail - Male Dormitory, Imus City, Cavite, Philippines.
                </div>

                {/* Signatures (Photo 11: Prepared by JO1 Aldrin Mangampo & Certified by JCINSP Charles Kenneth M Maquera) */}
                <div className="grid grid-cols-2 gap-8 pt-10 mt-6">
                  <div>
                    <div className="text-[10px] text-slate-600 mb-6">Prepared by:</div>
                    <div className="font-bold text-xs uppercase text-slate-950">Aldrin M. Mangampo</div>
                    <div className="text-[10px] text-slate-700">Jail Officer 1</div>
                    <div className="text-[9px] text-slate-500">PDL Records Officer</div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-600 mb-6">Certified Correct:</div>
                    <div className="font-extrabold text-xs uppercase text-slate-950">
                      CHARLES KENNETH M. MAQUERA
                    </div>
                    <div className="text-[10px] text-slate-700 font-semibold">Jail Chief Inspector</div>
                    <div className="text-[9px] text-slate-500 font-bold">City Jail Warden</div>
                  </div>
                </div>

              </div>
            )}

            {/* ========================================================
                DOCUMENT 3: PDL PROPERTY RECEIPT (Photo 3)
            ======================================================== */}
            {activeDocType === 'PROPERTY_RECEIPT' && currentPdl && (
              <div className="space-y-4 text-xs">
                <div className="text-center font-black uppercase text-sm tracking-wider bg-slate-100 border border-slate-400 py-1.5 rounded">
                  PDL'S PROPERTY RECEIPT
                </div>

                <div className="flex justify-between border-b border-slate-300 pb-2 text-[11px]">
                  <div>
                    <strong>RECEIPT #:</strong>{' '}
                    <span className="font-mono font-bold">{currentPdl.propertyReceipt?.receiptNumber || 'PR-2024-00192'}</span>
                  </div>
                  <div>
                    <strong>DATE:</strong>{' '}
                    <span className="font-mono">{currentPdl.propertyReceipt?.date || currentPdl.dateCommitted || '2024-03-12'}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded border border-slate-300 text-[11px] space-y-1">
                  <div>
                    <strong>Received from:</strong>{' '}
                    <span className="uppercase font-bold">{currentPdl.fullName}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <div><strong>PDL No.:</strong> <span className="font-mono font-bold">{currentPdl.pdlNumber}</span></div>
                    <div><strong>Charged with:</strong> <span>{currentPdl.primaryOffense}</span></div>
                  </div>
                </div>

                {/* Items Table (Photo 3) */}
                <div className="border border-slate-800 rounded overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2 w-32 border-r border-slate-700">Unit / Qty</th>
                        <th className="p-2">Description of Property / Valuables Deposited</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {(currentPdl.propertyReceipt?.items || [
                        { unit: '1 unit', description: 'Casio digital wristwatch, black strap' },
                        { unit: '1 pc', description: 'Black leather wallet with PhilSys ID' },
                        { unit: 'PHP', description: 'Philippine Currency amounting to Php 2,450.00' },
                      ]).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-mono font-bold border-r border-slate-200">{item.unit}</td>
                          <td className="p-2 text-slate-800">{item.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="text-[10px] text-slate-500 italic">
                  * Note: To be prepared in duplicate. Property to be returned to the PDL upon release from custody.
                </div>

                {/* Signatures & Thumbmark (Photo 3) */}
                <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-300 items-end">
                  
                  {/* Thumbmark Box */}
                  <div className="text-center">
                    <div className="w-24 h-24 border-2 border-dashed border-slate-600 mx-auto rounded flex flex-col items-center justify-center bg-slate-50 p-1">
                      <Fingerprint className="w-8 h-8 text-slate-400 mb-1" />
                      <span className="text-[8px] font-bold uppercase text-slate-600">Right Thumbmark</span>
                    </div>
                    <div className="font-bold uppercase text-[10px] mt-1.5">{currentPdl.fullName}</div>
                    <div className="text-[9px] text-slate-500">Name & Signature of PDL</div>
                  </div>

                  {/* Witness */}
                  <div className="text-center">
                    <div className="border-b border-slate-800 h-16 flex items-end justify-center font-bold text-[10px]">
                      JO2 Roberto S. Bautista
                    </div>
                    <div className="font-bold uppercase text-[10px] mt-1.5">JO2 Roberto S. Bautista</div>
                    <div className="text-[9px] text-slate-500">Name & Signature of Witness</div>
                  </div>

                  {/* Receiving Officer */}
                  <div className="text-center">
                    <div className="border-b border-slate-800 h-16 flex items-end justify-center font-bold text-[10px]">
                      JO1 Aldrin M. Mangampo
                    </div>
                    <div className="font-bold uppercase text-[10px] mt-1.5">JO1 Aldrin M. Mangampo</div>
                    <div className="text-[9px] text-slate-500">Property Custodian Officer</div>
                  </div>

                </div>

              </div>
            )}

            {/* ========================================================
                DOCUMENT 4: MANIPESTO NG DETENIDO - R.A. 10592 GCTA (Photo 10)
            ======================================================== */}
            {activeDocType === 'MANIPESTO_GCTA' && currentPdl && (
              <div className="space-y-5 text-xs leading-relaxed">
                <div className="text-center">
                  <h2 className="text-base font-extrabold uppercase tracking-widest font-serif text-slate-950 underline decoration-2 underline-offset-4">
                    MANIPESTO NG DETENIDO
                  </h2>
                  <p className="text-[10px] text-slate-600 font-semibold mt-0.5">
                    (Alinsunod sa mga Probisyon ng Republic Act No. 10592 - Good Conduct Time Allowance)
                  </p>
                </div>

                <div className="text-slate-800 space-y-3 pt-2 text-justify">
                  <p className="indent-8">
                    Ako, si <strong className="uppercase underline">{currentPdl.fullName}</strong>, 
                    {' '}{currentPdl.ageAtAdmission || '32'} taong gulang, mamamayang Pilipino, at kasalukuyang 
                    naninirahan sa <strong>{currentPdl.presentAddress}</strong>, matapos makapanumpa nang naayon sa batas, 
                    ay malaya at kusang-loob na nagpapahayag ng mga sumusunod:
                  </p>

                  <ol className="list-decimal pl-8 space-y-2">
                    <li>
                      Na ako ay kasalukuyang nakapiit sa <strong>BJMP Imus City Jail - Male Dormitory</strong> na may kasong{' '}
                      <strong>{currentPdl.primaryOffense}</strong> na may Criminal Case No.{' '}
                      <span className="font-mono font-bold">{currentPdl.criminalCaseNumbers?.join(', ')}</span> na nakabinbin 
                      sa <strong>{currentPdl.courtBranch}</strong>, Lungsod ng Imus, Lalawigan ng Cavite;
                    </li>
                    <li>
                      Na ako ay pinaalalahanan at lubos na naliwanagan ng aking tagapagtanggol (Counsel) at ng pamunuan 
                      ng piitan hinggil sa aking mga karapatan at mga pribilehiyo sa ilalim ng <strong>Republic Act No. 10592</strong>;
                    </li>
                    <li>
                      Na kusang-loob kong ipinahahayag na ako ay handang sumunod sa lahat ng mga umiiral na patakaran, 
                      alituntunin, at regulasyong ipinatutupad sa loob ng pasilidad na ito;
                    </li>
                    <li>
                      Na ako ay kusang lalahok sa mga programang pangkaunlaran tulad ng edukasyon, pangkabuhayan, 
                      at gawaing pangkaisipan upang mapabilis ang aking pagbabagong-buhay at maging karapat-dapat sa mga 
                      bawas-parusa (GCTA) na itinatadhana ng batas.
                    </li>
                  </ol>

                  <p className="indent-8 pt-2">
                    BILANG PATUNAY SA LAHAT NG ITO, ako ay lumagda ngayong ika-{' '}
                    <strong className="underline">{new Date().getDate()}</strong> ng{' '}
                    <strong className="underline">{new Date().toLocaleString('default', { month: 'long' })}, {new Date().getFullYear()}</strong>{' '}
                    sa Lungsod ng Imus, Cavite.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-8">
                  <div className="text-center">
                    <div className="border-b border-slate-800 w-48 mx-auto h-8"></div>
                    <div className="font-bold uppercase text-[10px] mt-1">{currentPdl.fullName}</div>
                    <div className="text-[9px] text-slate-500">Lagda ng Detenido / PDL</div>
                  </div>

                  <div className="text-center">
                    <div className="border-b border-slate-800 w-48 mx-auto h-8 flex items-end justify-center font-bold text-[10px]">
                      JCINSP CHARLES KENNETH M. MAQUERA
                    </div>
                    <div className="font-bold uppercase text-[10px] mt-1">JCINSP CHARLES KENNETH M. MAQUERA</div>
                    <div className="text-[9px] text-slate-500">City Jail Warden / Certifying Officer</div>
                  </div>
                </div>

              </div>
            )}

            {/* ========================================================
                DOCUMENT 5: PDL RECORD JACKET PROFILE (Photo 9)
            ======================================================== */}
            {activeDocType === 'RECORD_JACKET' && currentPdl && (
              <div className="space-y-4 text-[11px]">
                <div className="text-center font-black uppercase text-sm tracking-wider bg-slate-900 text-white py-1.5 rounded">
                  PERSON DEPRIVED OF LIBERTY (PDL) RECORD / JACKET PROFILE
                </div>

                <div className="grid grid-cols-3 gap-2 border border-slate-800 p-2.5 rounded bg-slate-50">
                  <div><strong>FILE NO:</strong> <span className="font-mono font-bold">{currentPdl.fileNumber || 'FN-2024-0192'}</span></div>
                  <div><strong>PRISONER NO:</strong> <span className="font-mono font-bold">{currentPdl.pdlNumber}</span></div>
                  <div><strong>FACILITY:</strong> <span>BJMP Imus Male Dormitory</span></div>
                </div>

                {/* Hearing Stages Checklist */}
                <div className="border border-slate-800 p-2.5 rounded">
                  <div className="font-bold uppercase text-slate-800 border-b border-slate-300 pb-1 mb-2">
                    Hearing Status Checklist (Court Progression)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Arraignment', checked: currentPdl.hearingStage?.arraignment ?? true },
                      { label: 'Pre-Trial', checked: currentPdl.hearingStage?.preTrial ?? true },
                      { label: 'Trial', checked: currentPdl.hearingStage?.trial ?? false },
                      { label: 'Prosecution Evidence', checked: currentPdl.hearingStage?.prosecutionEvidence ?? false },
                      { label: 'Defense Evidence', checked: currentPdl.hearingStage?.defenseEvidence ?? false },
                      { label: 'Decision / Promulgation', checked: currentPdl.hearingStage?.decision ?? false },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <span className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] font-bold ${
                          item.checked ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-400 bg-white'
                        }`}>
                          {item.checked ? '✓' : ''}
                        </span>
                        <span className={item.checked ? 'font-bold text-slate-900' : 'text-slate-600'}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sentence & GCTA Computations */}
                <div className="border border-slate-800 p-2.5 rounded space-y-1.5">
                  <div className="font-bold uppercase text-slate-800 border-b border-slate-300 pb-1">
                    Sentence & GCTA Expiration Calculations
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div><strong>Sentence Min:</strong> {currentPdl.sentence?.minimum || '12 Years'}</div>
                    <div><strong>Sentence Max:</strong> {currentPdl.sentence?.maximum || '20 Years'}</div>
                    <div><strong>Expiration Without GCTA:</strong> {currentPdl.sentence?.expirationWithoutGctaMax || '2044-03-12'}</div>
                    <div><strong>Expiration With GCTA:</strong> <span className="font-bold text-emerald-700">{currentPdl.sentence?.expirationWithGctaMax || '2038-11-20'}</span></div>
                  </div>
                </div>

                {/* Mandatory Documents Checklist (Photo 9) */}
                <div className="border border-slate-800 p-2.5 rounded">
                  <div className="font-bold uppercase text-slate-800 border-b border-slate-300 pb-1 mb-2">
                    Official Documents Attached Checklist
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Mittimus / Order of Commitment', checked: currentPdl.documentsChecklist?.mitimus ?? true },
                      { label: 'Judgement / Court Order', checked: currentPdl.documentsChecklist?.judgementCourtOrder ?? true },
                      { label: 'Certificate of Non-Pending Case', checked: currentPdl.documentsChecklist?.nonPendingCertificate ?? true },
                      { label: 'Commitment Information Sheet', checked: currentPdl.documentsChecklist?.commitmentInformation ?? true },
                      { label: 'Computation of GCTA Sheet', checked: currentPdl.documentsChecklist?.computationOfGcta ?? true },
                      { label: 'Certificate of Detention', checked: currentPdl.documentsChecklist?.certificateOfDetention ?? true },
                      { label: 'Health & Physical Exam Certificate', checked: currentPdl.documentsChecklist?.healthCertificates ?? true },
                      { label: 'Drug Dependency Exam (DDE Result)', checked: currentPdl.documentsChecklist?.ddeResult ?? true },
                    ].map((doc, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] font-bold ${
                          doc.checked ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-400 bg-white'
                        }`}>
                          {doc.checked ? '✓' : ''}
                        </span>
                        <span className={doc.checked ? 'font-medium text-slate-900' : 'text-slate-500'}>{doc.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* ========================================================
                DOCUMENT 6: BERTILLION & BODY TATTOO / SCAR CHART (Photo 6)
            ======================================================== */}
            {activeDocType === 'BERTILLION_BODY_CHART' && currentPdl && (
              <div className="space-y-4 text-[11px]">
                <div className="text-center font-black uppercase text-sm tracking-wider bg-slate-900 text-white py-1.5 rounded">
                  INMATE BERTILLION / TATTOO & SCAR BODY IDENTIFICATION CHART
                </div>

                <div className="bg-slate-50 border border-slate-400 p-2.5 rounded grid grid-cols-3 gap-2 text-[10px]">
                  <div><strong>NAME:</strong> <span className="font-bold">{currentPdl.fullName}</span></div>
                  <div><strong>PDL NO:</strong> <span className="font-mono font-bold">{currentPdl.pdlNumber}</span></div>
                  <div><strong>CELL/BRIGADA:</strong> <span className="font-bold">{currentPdl.cellDormitory}</span></div>
                </div>

                {/* Body Silhouette Outline Visual (Photo 6) */}
                <div className="border border-slate-800 p-4 rounded bg-slate-50">
                  <div className="text-center font-bold text-xs uppercase text-slate-700 mb-3">
                    Anatomical Silhouette Chart (Front, Back, Right Profile, Left Profile)
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3 text-center">
                    {['RIGHT PROFILE', 'FRONT VIEW', 'LEFT PROFILE', 'BACK VIEW'].map((view, vi) => (
                      <div key={vi} className="border border-slate-300 bg-white p-3 rounded h-48 flex flex-col justify-between items-center relative overflow-hidden">
                        <span className="text-[9px] font-bold text-slate-500">{view}</span>
                        
                        {/* Anatomical Figure Mockup */}
                        <div className="w-16 h-28 border border-slate-300 rounded-full flex flex-col items-center justify-center text-slate-300 relative">
                          <div className="w-5 h-5 rounded-full border border-slate-400 mb-1"></div>
                          <div className="w-8 h-14 border border-slate-400 rounded-lg"></div>
                          <div className="flex gap-2 mt-0.5">
                            <div className="w-2.5 h-10 border border-slate-400"></div>
                            <div className="w-2.5 h-10 border border-slate-400"></div>
                          </div>

                          {/* Tattoo Pin indicator */}
                          {vi === 1 && (
                            <div className="absolute top-10 left-1 bg-rose-600 text-white text-[7px] px-1 rounded font-bold shadow animate-pulse">
                              TATTOO #1
                            </div>
                          )}
                          {vi === 3 && (
                            <div className="absolute top-12 right-1 bg-amber-600 text-white text-[7px] px-1 rounded font-bold shadow">
                              SCAR #2
                            </div>
                          )}
                        </div>

                        <span className="text-[8px] text-slate-400">Anatomical Grid</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tattoo / Scar Log Table */}
                <div className="border border-slate-800 rounded overflow-hidden">
                  <div className="bg-slate-100 font-bold uppercase p-1.5 text-[10px] border-b border-slate-800">
                    Recorded Bertillion Marks Description
                  </div>
                  <div className="p-2.5 space-y-1.5 text-[10px] bg-white">
                    <div>
                      <strong>Full Description:</strong>
                      <p className="bg-slate-50 p-2 rounded border border-slate-200 mt-1 font-mono text-slate-800">
                        {currentPdl.bertillionMarks || 'No visible marks'}
                      </p>
                    </div>
                    {currentPdl.bodyMarks && currentPdl.bodyMarks.length > 0 && (
                      <div className="pt-2">
                        <strong>Digital chart markers:</strong>
                        <ol className="mt-1 list-decimal pl-5 space-y-0.5 font-mono">
                          {currentPdl.bodyMarks.map((mark, index) => (
                            <li key={mark.id}>
                              {mark.kind} #{index + 1} — {mark.view.toLowerCase()} view ({mark.x}%, {mark.y}%): {mark.description}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* ========================================================
                DOCUMENT 7: COMMITMENT LOGS / MONTHLY REGISTER (Photo 1 & 2)
            ======================================================== */}
            {(activeDocType === 'PALM_FINGERPRINT_RECORD' || activeDocType === 'CERTIFICATE_OF_DISCHARGE' || activeDocType === 'RELEASE_REGISTER') && currentPdl && (
              <div className="bg-white text-slate-900 p-8 sm:p-12 min-h-[650px] shadow-inner font-serif">
                <div className="text-center border-b-2 border-slate-900 pb-4 mb-7">
                  <div className="font-bold text-lg">BUREAU OF JAIL MANAGEMENT AND PENOLOGY</div>
                  <div className="font-bold">IMUS CITY JAIL - MALE DORMITORY</div>
                  <div className="text-xs">Digital record generated from the BJMP visitation and PDL database</div>
                </div>
                {activeDocType === 'PALM_FINGERPRINT_RECORD' && <>
                  <h2 className="text-center font-bold text-xl mb-6">PALM / FINGERPRINT RECORD</h2>
                  <p><b>PDL:</b> {currentPdl.fullName} &nbsp;&nbsp; <b>BJMP ID:</b> {currentPdl.bjmpIdNumber || '—'}</p>
                  <p className="mt-2"><b>Physical identifiers:</b> {currentPdl.bertillionMarks || 'None recorded'}</p>
                  <div className="grid grid-cols-2 gap-4 mt-7">{['LEFT PALM', 'RIGHT PALM', 'LEFT HAND FINGERS', 'RIGHT HAND FINGERS'].map((label) => <div key={label} className="h-44 border-2 border-slate-700 p-3 font-bold text-sm">{label}<div className="text-xs font-normal mt-2">Capture with the approved physical fingerprint device.</div></div>)}</div>
                </>}
                {activeDocType === 'CERTIFICATE_OF_DISCHARGE' && <>
                  <h2 className="text-center font-bold text-xl mb-6">CERTIFICATE OF DISCHARGE</h2>
                  <p>This certifies that <b>{currentPdl.fullName}</b>, File No. <b>{currentPdl.fileNumber || '—'}</b>, has a digital release record prepared for authorized approval.</p>
                  <div className="grid grid-cols-2 gap-6 mt-8 text-sm"><p><b>Date committed:</b> {currentPdl.dateCommitted || '—'}</p><p><b>Current case status:</b> {currentPdl.caseStatus || '—'}</p><p><b>Offense:</b> {currentPdl.primaryOffense || '—'}</p><p><b>Release mode:</b> To be approved</p></div>
                  <div className="grid grid-cols-2 gap-6 mt-14"><div className="h-32 border">LEFT THUMBMARK</div><div className="h-32 border">RIGHT THUMBMARK</div></div>
                </>}
                {activeDocType === 'RELEASE_REGISTER' && <>
                  <h2 className="text-center font-bold text-xl mb-6">MONTHLY RELEASE REGISTER</h2>
                  <table className="w-full border-collapse text-xs"><thead><tr>{['Date released', 'Name of PDL', 'Date of birth', 'Sex', 'Case / offense', 'Mode of release', 'Status'].map((heading) => <th className="border p-2" key={heading}>{heading}</th>)}</tr></thead><tbody><tr>{['—', currentPdl.fullName, currentPdl.dateOfBirth || '—', currentPdl.sex || '—', currentPdl.primaryOffense || '—', 'To be approved', currentPdl.status].map((value, index) => <td className="border p-2" key={index}>{value}</td>)}</tr></tbody></table>
                </>}
                <p className="mt-10 text-xs text-slate-500">This page is a digital workflow record. Capture biometric data only using approved BJMP hardware.</p>
              </div>
            )}

            {activeDocType === 'COMMITMENT_REGISTER' && (
              <div className="space-y-4 text-[10px]">
                <div className="text-center font-black uppercase text-sm tracking-wider bg-slate-900 text-white py-1.5 rounded">
                  COMMIT - Reports / Logs Generation (Monthly Commitment Register)
                </div>

                <div className="flex justify-between items-center bg-slate-100 p-2 rounded border border-slate-300 font-bold text-xs">
                  <span>MONTH & YEAR: {selectedMonth}</span>
                  <span>FACILITY: BJMP IMUS CITY JAIL</span>
                </div>

                {/* Full 20-Column Table from Photo 1 & 2 */}
                <div className="overflow-x-auto border border-slate-800 rounded">
                  <table className="w-full text-left text-[9px] whitespace-nowrap">
                    <thead className="bg-slate-950 text-white font-bold uppercase">
                      <tr>
                        <th className="p-1.5 border-r border-slate-800">Date Committed</th>
                        <th className="p-1.5 border-r border-slate-800">Name of PDL</th>
                        <th className="p-1.5 border-r border-slate-800">DOB</th>
                        <th className="p-1.5 border-r border-slate-800">Age</th>
                        <th className="p-1.5 border-r border-slate-800">Sex</th>
                        <th className="p-1.5 border-r border-slate-800">Civil Status</th>
                        <th className="p-1.5 border-r border-slate-800">Citizenship</th>
                        <th className="p-1.5 border-r border-slate-800">Address</th>
                        <th className="p-1.5 border-r border-slate-800">Education</th>
                        <th className="p-1.5 border-r border-slate-800">Occupation</th>
                        <th className="p-1.5 border-r border-slate-800">Case / Offense</th>
                        <th className="p-1.5 border-r border-slate-800">Counts</th>
                        <th className="p-1.5 border-r border-slate-800">Criminal Case #</th>
                        <th className="p-1.5 border-r border-slate-800">Court / Branch</th>
                        <th className="p-1.5 border-r border-slate-800">Judge</th>
                        <th className="p-1.5">Case Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pdlList.map((pdl, idx) => (
                        <tr key={pdl.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-1.5 font-mono border-r border-slate-200">{pdl.dateCommitted || '2024-03-12'}</td>
                          <td className="p-1.5 font-bold border-r border-slate-200">{pdl.fullName}</td>
                          <td className="p-1.5 font-mono border-r border-slate-200">{pdl.dateOfBirth || '1992-04-15'}</td>
                          <td className="p-1.5 border-r border-slate-200">{pdl.ageAtAdmission || '32'}</td>
                          <td className="p-1.5 border-r border-slate-200">{pdl.sex || 'Male'}</td>
                          <td className="p-1.5 border-r border-slate-200">{pdl.civilStatus || 'Single'}</td>
                          <td className="p-1.5 border-r border-slate-200">{pdl.citizenship || 'Filipino'}</td>
                          <td className="p-1.5 max-w-[120px] truncate border-r border-slate-200" title={pdl.presentAddress}>
                            {pdl.presentAddress}
                          </td>
                          <td className="p-1.5 border-r border-slate-200">{pdl.highestEducationalAttainment || 'High School'}</td>
                          <td className="p-1.5 border-r border-slate-200">{pdl.occupation || 'Worker'}</td>
                          <td className="p-1.5 max-w-[140px] truncate border-r border-slate-200" title={pdl.primaryOffense}>
                            {pdl.primaryOffense}
                          </td>
                          <td className="p-1.5 text-center border-r border-slate-200">1</td>
                          <td className="p-1.5 font-mono font-bold border-r border-slate-200">{pdl.criminalCaseNumbers?.[0] || 'CC-24-10294'}</td>
                          <td className="p-1.5 border-r border-slate-200">{pdl.courtBranch || 'RTC Branch 20'}</td>
                          <td className="p-1.5 border-r border-slate-200">{pdl.presidingJudge || 'Hon. Amy A. Alabastro'}</td>
                          <td className="p-1.5 font-semibold text-slate-800">{pdl.caseStatus || 'Under Trial'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Totals (Photo 1 & 2) */}
                <div className="flex justify-between items-center bg-slate-100 p-2.5 rounded border border-slate-400 font-bold text-xs mt-3">
                  <div>Total Commit (Male): <span className="font-mono text-slate-900">{maleCount}</span></div>
                  <div>Total Commit (Female): <span className="font-mono text-slate-900">{femaleCount}</span></div>
                  <div>TOTAL INMATES: <span className="font-mono text-slate-900">{pdlList.length}</span></div>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
