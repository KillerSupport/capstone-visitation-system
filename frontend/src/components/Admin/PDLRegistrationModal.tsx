import React, { useEffect, useRef, useState } from 'react';
import {
  X, UserPlus, FileText, Shield, User, MapPin, Scale,
  Check, AlertTriangle, Sparkles, Plus, Trash2, Camera,
  Package, Calendar, CheckSquare, Fingerprint
} from 'lucide-react';
import { PDL, MaritalStatus, PDLBodyMark, UserAddress } from '../../types';
import { BJMP_JAIL_FACILITIES } from '../../data/bjmpData';
import { BodyMarkPicker } from './BodyMarkPicker';
import { SignatureCapture } from '../Common/SignatureCapture';
import { AddressFields, addressFromSaved, formatAddress } from '../Common/AddressFields';
import { MobileInput, mobileDigits, todayInManila } from '../Common/IdentityFields';
import { api } from '../../services/api';

interface PDLRegistrationModalProps {
  onClose: () => void;
  onSave: (pdl: PDL) => void | PDL | Promise<void | PDL>;
  existingPdl?: PDL | null;
}

type TabKey = 'DEMOGRAPHICS' | 'PHYSICAL' | 'FAMILY' | 'ARREST' | 'LEGAL' | 'PROPERTY' | 'DOCUMENTS';

const IMUS_PDL_FACILITY_IDS = ['imus-city-jail-male', 'imus-city-jail-female'];
const IMUS_PDL_FACILITIES = BJMP_JAIL_FACILITIES.filter((facility) => IMUS_PDL_FACILITY_IDS.includes(facility.id));
const CHARGED_VIOLATION_SUGGESTIONS = [
  'Theft — Article 308, Revised Penal Code',
  'Qualified Theft — Article 310, Revised Penal Code',
  'Robbery — Article 293, Revised Penal Code',
  'Estafa — Article 315, Revised Penal Code',
  'Murder — Article 248, Revised Penal Code',
  'Homicide — Article 249, Revised Penal Code',
  'Physical Injuries — Article 263, Revised Penal Code',
  'Violation of Section 5, Article II, R.A. 9165 — Sale or Trading of Dangerous Drugs',
  'Violation of Section 11, Article II, R.A. 9165 — Possession of Dangerous Drugs',
  'Violation of Section 12, Article II, R.A. 9165 — Possession of Drug Paraphernalia',
  'Violation of Section 28(a), R.A. 10591 — Unlawful Acquisition or Possession of a Small Arm',
];
const IMUS_COURT_BRANCH_SUGGESTIONS = [
  ...[20, 21, 22, 120, 121, 122, 123, 124, 125, 126, 127].map((branch) => `RTC Branch ${branch}, City of Imus, Cavite`),
  'RTC Family Court Branch 4, City of Imus, Cavite',
  ...[1, 2, 3, 4].map((branch) => `MTCC Branch ${branch}, City of Imus, Cavite`),
];

export const PDLRegistrationModal: React.FC<PDLRegistrationModalProps> = ({
  onClose,
  onSave,
  existingPdl,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('DEMOGRAPHICS');
  const formRef = useRef<HTMLFormElement>(null);
  const [saving,setSaving]=useState(false),[saveError,setSaveError]=useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState(existingPdl?.signatureDataUrl || '');

  // Identification & Demographics
  const [lastName, setLastName] = useState(existingPdl?.lastName || '');
  const [firstName, setFirstName] = useState(existingPdl?.firstName || '');
  const [middleName, setMiddleName] = useState(existingPdl?.middleName || '');
  const [suffix, setSuffix] = useState(existingPdl?.suffix || '');
  const [aliases, setAliases] = useState(existingPdl?.aliases || '');
  const [pdlNumber, setPdlNumber] = useState(
    existingPdl?.pdlNumber || '');
  const [fileNumber, setFileNumber] = useState(
    existingPdl?.fileNumber || '');
  const [bjmpIdNumber, setBjmpIdNumber] = useState(
    existingPdl?.bjmpIdNumber || '');
  const [sex, setSex] = useState<'Male' | 'Female'>(existingPdl?.sex || 'Male');
  const [dateOfBirth, setDateOfBirth] = useState(existingPdl?.dateOfBirth || '');
  const [ageAtAdmission, setAgeAtAdmission] = useState<number>(existingPdl?.ageAtAdmission || 0);
  const [placeOfBirth, setPlaceOfBirth] = useState(existingPdl?.placeOfBirth || '');
  const [civilStatus, setCivilStatus] = useState<MaritalStatus>(existingPdl?.civilStatus || 'Single');
  const [citizenship, setCitizenship] = useState(existingPdl?.citizenship || 'Filipino');
  const [religion, setReligion] = useState(existingPdl?.religion || '');
  const [tribalAffiliation, setTribalAffiliation] = useState(existingPdl?.tribalAffiliation || '');
  const [presentAddress, setPresentAddress] = useState<UserAddress>(addressFromSaved(existingPdl?.presentAddress || '', existingPdl?.presentAddressDetails));
  const [provincialAddress, setProvincialAddress] = useState<UserAddress>(addressFromSaved(existingPdl?.provincialAddress || '', existingPdl?.provincialAddressDetails));
  const [highestEducationalAttainment, setHighestEducationalAttainment] = useState(
    existingPdl?.highestEducationalAttainment || '');
  const [course, setCourse] = useState(existingPdl?.course || '');
  const [occupation, setOccupation] = useState(existingPdl?.occupation || '');
  const [skills, setSkills] = useState(existingPdl?.skills || '');
  const [gangGroupAffiliation, setGangGroupAffiliation] = useState(
    existingPdl?.gangGroupAffiliation || '');

  // Physical & Bertillion
  const [height, setHeight] = useState(existingPdl?.height || '');
  const [weight, setWeight] = useState(existingPdl?.weight || '');
  const [built, setBuilt] = useState(existingPdl?.built || '');
  const [complexion, setComplexion] = useState(existingPdl?.complexion || '');
  const [eyes, setEyes] = useState(existingPdl?.eyes || '');
  const [hair, setHair] = useState(existingPdl?.hair || '');
  const [bloodType, setBloodType] = useState(existingPdl?.bloodType || '');
  const [mannerism, setMannerism] = useState(existingPdl?.mannerism || '');
  const [dialectsSpoken, setDialectsSpoken] = useState(existingPdl?.dialectsSpoken || '');
  const [bertillionMarks, setBertillionMarks] = useState(
    existingPdl?.bertillionMarks || '');
  const [bodyMarks, setBodyMarks] = useState<PDLBodyMark[]>(existingPdl?.bodyMarks || []);

  // Family & Emergency
  const [spouseName, setSpouseName] = useState(existingPdl?.spouseName || '');
  const [fatherName, setFatherName] = useState(existingPdl?.fatherName || '');
  const [fatherAddress, setFatherAddress] = useState<UserAddress>(addressFromSaved(existingPdl?.fatherAddress || '', existingPdl?.fatherAddressDetails));
  const [motherName, setMotherName] = useState(existingPdl?.motherName || '');
  const [motherAddress, setMotherAddress] = useState<UserAddress>(addressFromSaved(existingPdl?.motherAddress || '', existingPdl?.motherAddressDetails));
  const [numberOfChildren, setNumberOfChildren] = useState<number>(existingPdl?.numberOfChildren || 0);
  const [childrenNamesStr, setChildrenNamesStr] = useState(existingPdl?.childrenNames?.join(', ') || '');
  const [emergencyContactPerson, setEmergencyContactPerson] = useState(
    existingPdl?.emergencyContactPerson || '');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(
    existingPdl?.emergencyContactRelation || '');
  const [emergencyContactAddress, setEmergencyContactAddress] = useState<UserAddress>(addressFromSaved(existingPdl?.emergencyContactAddress || '', existingPdl?.emergencyContactAddressDetails));
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(mobileDigits(existingPdl?.emergencyContactPhone || ''));

  // Arrest & Intake
  const [dateCommitted, setDateCommitted] = useState(
    existingPdl?.dateCommitted || new Date().toISOString().split('T')[0]
  );
  const [timeAndDateOfArrest, setTimeAndDateOfArrest] = useState(
    existingPdl?.timeAndDateOfArrest || '');
  const [placeOfArrest, setPlaceOfArrest] = useState(
    existingPdl?.placeOfArrest || '');
  const [arrestingOfficer, setArrestingOfficer] = useState(
    existingPdl?.arrestingOfficer || '');
  const [timeDateOfDetentionLea, setTimeDateOfDetentionLea] = useState(
    existingPdl?.timeDateOfDetentionLea || '');
  const [receivingOfficer, setReceivingOfficer] = useState(
    existingPdl?.receivingOfficer || '');
  const [searchedBy, setSearchedBy] = useState(existingPdl?.searchedBy || '');
  const [jailFacilityId, setJailFacilityId] = useState(
    existingPdl?.sex === 'Female' ? 'imus-city-jail-female' : 'imus-city-jail-male'
  );
  const [cellDormitory, setCellDormitory] = useState(
    existingPdl?.cellDormitory || '');
  const [status, setStatus] = useState<PDL['status']>(existingPdl?.status || 'In Custody');
  const [releaseDate, setReleaseDate] = useState(existingPdl?.releaseDate || '');
  const [releaseMode, setReleaseMode] = useState(existingPdl?.releaseMode || '');

  // Legal & Court
  const [primaryOffense, setPrimaryOffense] = useState(
    existingPdl?.primaryOffense || '');
  const [caseNumberSuffix, setCaseNumberSuffix] = useState(
    (existingPdl?.cases?.[0]?.caseNumber || existingPdl?.criminalCaseNumbers?.[0] || '').replace(/^CC-/i, ''));
  const [counts1, setCounts1] = useState<number>(existingPdl?.cases?.[0]?.counts || 1);
  const [dateCrimeCommitted, setDateCrimeCommitted] = useState(
    existingPdl?.dateCrimeCommitted || '');
  const [courtBranch, setCourtBranch] = useState(
    existingPdl?.courtBranch || '');
  const [presidingJudge, setPresidingJudge] = useState(
    existingPdl?.presidingJudge || '');
  const [caseStatus, setCaseStatus] = useState(existingPdl?.caseStatus || '');
  const [stageArraignment, setStageArraignment] = useState(existingPdl?.hearingStage?.arraignment ?? false);
  const [stagePreTrial, setStagePreTrial] = useState(existingPdl?.hearingStage?.preTrial ?? false);
  const [stageTrial, setStageTrial] = useState(existingPdl?.hearingStage?.trial ?? false);
  const [stageProsecution, setStageProsecution] = useState(existingPdl?.hearingStage?.prosecutionEvidence ?? false);
  const [stageDefense, setStageDefense] = useState(existingPdl?.hearingStage?.defenseEvidence ?? false);
  const [stageDecision, setStageDecision] = useState(existingPdl?.hearingStage?.decision ?? false);

  // Property Receipt items
  const [propertyItems, setPropertyItems] = useState<{ unit: string; description: string }[]>(
    existingPdl?.propertyReceipt?.items || []
  );
  const [propertyReceiptNumber, setPropertyReceiptNumber] = useState(
    existingPdl?.propertyReceipt?.receiptNumber || '');
  const [propertyReceiptLoading, setPropertyReceiptLoading] = useState(!existingPdl?.propertyReceipt?.receiptNumber);

  useEffect(() => {
    if (existingPdl?.propertyReceipt?.receiptNumber) {
      setPropertyReceiptNumber(existingPdl.propertyReceipt.receiptNumber);
      setPropertyReceiptLoading(false);
      return;
    }
    let active = true;
    setPropertyReceiptLoading(true);
    void api.getNextPropertyReceiptNumber()
      .then(({ receiptNumber }) => { if (active) setPropertyReceiptNumber(receiptNumber); })
      .catch(() => {})
      .finally(() => { if (active) setPropertyReceiptLoading(false); });
    return () => { active = false; };
  }, [existingPdl?.id, existingPdl?.propertyReceipt?.receiptNumber]);

  // Documents Checklist & GCTA
  const [chkMittimus, setChkMittimus] = useState(existingPdl?.documentsChecklist?.mitimus ?? false);
  const [chkCourtOrder, setChkCourtOrder] = useState(existingPdl?.documentsChecklist?.judgementCourtOrder ?? false);
  const [chkNonPending, setChkNonPending] = useState(existingPdl?.documentsChecklist?.nonPendingCertificate ?? false);
  const [chkCommitmentInfo, setChkCommitmentInfo] = useState(existingPdl?.documentsChecklist?.commitmentInformation ?? false);
  const [chkGctaCalc, setChkGctaCalc] = useState(existingPdl?.documentsChecklist?.computationOfGcta ?? false);
  const [chkCertDetention, setChkCertDetention] = useState(existingPdl?.documentsChecklist?.certificateOfDetention ?? false);
  const [chkHealthCert, setChkHealthCert] = useState(existingPdl?.documentsChecklist?.healthCertificates ?? false);
  const [chkDde, setChkDde] = useState(existingPdl?.documentsChecklist?.ddeResult ?? false);
  const [ra10592Signed, setRa10592Signed] = useState(existingPdl?.ra10592ManifestationSigned ?? false);

  // Quick fill sample data helper
  const handleQuickFillDemo = () => {
    setLastName('Villarama');
    setFirstName('Crisanto');
    setMiddleName('Flores');
    setSuffix('');
    setAliases('');
    setPdlNumber('');
    setSex('Male');
    setDateOfBirth('1994-09-28');
    setAgeAtAdmission(30);
    setPlaceOfBirth('Imus City, Cavite');
    setCivilStatus('Married');
    setCitizenship('Filipino');
    setReligion('Roman Catholic');
    setTribalAffiliation('Tagalog');
    setPresentAddress(addressFromSaved('Blk 8 Lot 15, Greenstate Subd., Brgy. Malagasang 2-A, Imus City, Cavite'));
    setProvincialAddress(addressFromSaved('Sitio Maligaya, Silang, Cavite'));
    setHighestEducationalAttainment('High School Graduate');
    setCourse('Secondary Education');
    setOccupation('Motorcycle Courier / Rider');
    setSkills('Vehicle maneuvering, Small engine tuneup');
    setGangGroupAffiliation('Batang City Jail (BCJ)');
    setHeight('5\'8" (173 cm)');
    setWeight('71 kg (156 lbs)');
    setBuilt('Medium Built');
    setComplexion('Brown / Kayumanggi');
    setEyes('Black');
    setHair('Straight Black');
    setBloodType('O+');
    setBertillionMarks('Cross with initials "CF" on right wrist; 3-inch burn scar on right forearm; Panther head tattoo on left upper chest');
    setSpouseName('Clarissa Manalo Villarama');
    setFatherName('Danilo Villarama');
    setFatherAddress(addressFromSaved('Brgy. Malagasang 2-A, Imus City, Cavite'));
    setMotherName('Rosalinda Flores Villarama');
    setMotherAddress(addressFromSaved('Brgy. Malagasang 2-A, Imus City, Cavite'));
    setNumberOfChildren(2);
    setChildrenNamesStr('Christian Villarama (7 y/o), Chloe Villarama (3 y/o)');
    setEmergencyContactPerson('Clarissa Manalo Villarama');
    setEmergencyContactRelation('Spouse');
    setEmergencyContactAddress(addressFromSaved('Blk 8 Lot 15, Greenstate Subd., Brgy. Malagasang 2-A, Imus City, Cavite'));
    setEmergencyContactPhone('9183218844');
    setDateCommitted(new Date().toISOString().split('T')[0]);
    setDateCrimeCommitted('2025-01-10');
    setTimeAndDateOfArrest('2025-01-11 11:20 PM');
    setPlaceOfArrest('Nueno Avenue corner Tanzang Luma, Imus City, Cavite');
    setArrestingOfficer('PEMS. Dante Villanueva (Imus CPS)');
    setTimeDateOfDetentionLea('2025-01-12 01:10 AM');
    setReceivingOfficer('JO1 Aldrin M. Mangampo');
    setSearchedBy('JO1 Roberto Bautista');
    setJailFacilityId('imus-city-jail-male');
    setCellDormitory('Brigada 3 - Cell Dorm A');
    setPrimaryOffense('Robbery with Intimidation (Art. 294 RPC) & Illegal Possession of Weapon');
    setCaseNumberSuffix('25-11840');
    setCounts1(1);
    setCourtBranch('RTC Branch 20, Imus City, Cavite');
    setPresidingJudge('Hon. Amy Ana L. De Villa-Rosales');
    setCaseStatus('Under Trial (Arraignment Pending)');
    setStageArraignment(true);
    setStagePreTrial(false);
    setPropertyItems([
      { unit: '1 unit', description: 'G-Shock digital watch black' },
      { unit: '1 pc', description: 'Black bi-fold wallet containing PhilSys ID' },
      { unit: 'PHP', description: 'Php 1,820.00 cash' },
      { unit: '1 unit', description: 'Infinix smartphone blue (switched off)' },
    ]);
  };

  const handleAddPropertyItem = () => {
    setPropertyItems([...propertyItems, { unit: '1 pc', description: '' }]);
  };

  const handleRemovePropertyItem = (index: number) => {
    setPropertyItems(propertyItems.filter((_, i) => i !== index));
  };

  const handleUpdatePropertyItem = (index: number, field: 'unit' | 'description', value: string) => {
    const next = [...propertyItems];
    next[index] = { ...next[index], [field]: value };
    setPropertyItems(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const caseNumberRemainder = caseNumberSuffix.trim().replace(/^CC-/i, '');
    const caseNumber1 = caseNumberRemainder ? `CC-${caseNumberRemainder}` : '';

    const constructedFullName = [firstName, middleName, lastName, suffix]
      .filter(Boolean)
      .join(' ');

    const childrenArr = childrenNamesStr
      ? childrenNamesStr.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const newPDL: PDL = {
      id: existingPdl?.id || `pdl-${Date.now()}`,
      signatureDataUrl,
      signatureCapturedAt: signatureDataUrl ? new Date().toISOString() : existingPdl?.signatureCapturedAt,
      releaseDate: status === 'Released' ? releaseDate : existingPdl?.releaseDate,
      releaseMode: status === 'Released' ? releaseMode : existingPdl?.releaseMode,
      pdlNumber,
      fileNumber,
      bjmpIdNumber,
      lastName,
      firstName,
      middleName,
      suffix,
      fullName: constructedFullName || 'Inmate PDL',
      aliases,
      sex,
      dateOfBirth,
      ageAtAdmission: Number(ageAtAdmission) || undefined,
      placeOfBirth,
      civilStatus,
      citizenship,
      religion,
      tribalAffiliation,
      presentAddress: formatAddress(presentAddress),
      presentAddressDetails: presentAddress,
      provincialAddress: formatAddress(provincialAddress),
      provincialAddressDetails: provincialAddress,
      highestEducationalAttainment,
      course,
      occupation,
      skills,
      gangGroupAffiliation,
      height,
      weight,
      built,
      complexion,
      eyes,
      hair,
      bloodType,
      mannerism,
      dialectsSpoken,
      bertillionMarks,
      bodyMarks,
      spouseName,
      fatherName,
      fatherAddress: formatAddress(fatherAddress),
      fatherAddressDetails: fatherAddress,
      motherName,
      motherAddress: formatAddress(motherAddress),
      motherAddressDetails: motherAddress,
      numberOfChildren: Number(numberOfChildren) || 0,
      childrenNames: childrenArr,
      emergencyContactPerson,
      emergencyContactRelation,
      emergencyContactAddress: formatAddress(emergencyContactAddress),
      emergencyContactAddressDetails: emergencyContactAddress,
      emergencyContactPhone: emergencyContactPhone ? `+63${emergencyContactPhone}` : '',
      dateCommitted,
      dateCrimeCommitted,
      timeAndDateOfArrest,
      placeOfArrest,
      arrestingOfficer,
      timeDateOfDetentionLea,
      receivingOfficer,
      searchedBy,
      jailFacilityId,
      cellDormitory,
      status,
      allowedVisitorRelationship: existingPdl?.allowedVisitorRelationship || [
        'Spouse', 'Parent', 'Child', 'Sibling', 'Legal Counsel'
      ],
      primaryOffense,
      criminalCaseNumbers: [caseNumber1,...(existingPdl?.criminalCaseNumbers||[]).slice(1)].filter(Boolean),
      cases: [
        {
          caseNumber: caseNumber1,
          offense: primaryOffense,
          counts: counts1,
          dateCrimeCommitted,
          courtBranch,
          presidingJudge,
          caseStatus,
        },
        ...(existingPdl?.cases||[]).slice(1),
      ].filter(record=>Boolean(record.caseNumber)),
      courtBranch,
      presidingJudge,
      caseStatus,
      hearingStage: {
        arraignment: stageArraignment,
        preTrial: stagePreTrial,
        trial: stageTrial,
        prosecutionEvidence: stageProsecution,
        defenseEvidence: stageDefense,
        decision: stageDecision,
      },
      ra10592ManifestationSigned: ra10592Signed,
      documentsChecklist: {
        mitimus: chkMittimus,
        judgementCourtOrder: chkCourtOrder,
        nonPendingCertificate: chkNonPending,
        commitmentInformation: chkCommitmentInfo,
        computationOfGcta: chkGctaCalc,
        certificateOfDetention: chkCertDetention,
        healthCertificates: chkHealthCert,
        ddeResult: chkDde,
      },
      propertyReceipt: {
        receiptNumber: propertyReceiptNumber,
        date: dateCommitted,
        items: propertyItems.filter((i) => i.description.trim() !== ''),
        receivingOfficer,
        designation: 'PDL Records / Valuables Custodian',
      },
    };

    if(saving)return;
    setSaving(true);setSaveError('');
    try{
      const savedPdl = await onSave(newPDL);
      if (savedPdl?.propertyReceipt?.receiptNumber) setPropertyReceiptNumber(savedPdl.propertyReceipt.receiptNumber);
      onClose();
    }catch(error){setSaveError(error instanceof Error?error.message:'The PDL record could not be saved. Your entries have been retained.');}finally{setSaving(false);}
  };

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'DEMOGRAPHICS', label: '1. Inmate Demographics', icon: User },
    { key: 'PHYSICAL', label: '2. Physical & Bertillion', icon: Fingerprint },
    { key: 'FAMILY', label: '3. Family & Nearest Kin', icon: UserPlus },
    { key: 'ARREST', label: '4. Arrest & Booking Intake', icon: Shield },
    { key: 'LEGAL', label: '5. Court & Criminal Cases', icon: Scale },
    { key: 'PROPERTY', label: '6. Property Receipt', icon: Package },
    { key: 'DOCUMENTS', label: '7. GCTA & Documents', icon: CheckSquare },
  ];
  const activeStepIndex = tabs.findIndex((tab) => tab.key === activeTab);
  const moveStep = (direction: -1 | 1) => {
    if (direction > 0) {
      const form = formRef.current;
      const requiredFields = form ? Array.from(form.querySelectorAll<HTMLElement>(':required')) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[] : [];
      const invalidField = requiredFields.find((field) => !field.checkValidity());
      if (invalidField) {
        invalidField.reportValidity();
        invalidField.focus();
        return;
      }
    }
    const nextIndex = Math.max(0, Math.min(tabs.length - 1, activeStepIndex + direction));
    setActiveTab(tabs[nextIndex].key);
    formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-blue-500/40 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30">
                  BJMP STANDARD FORM
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Republic of the Philippines • DILG
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                {existingPdl ? 'Edit PDL Institutional Booking Record' : 'BJMP Inmate (PDL) Commitment & Booking Register'}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!existingPdl && (
              <button
                type="button"
                onClick={handleQuickFillDemo}
                className="bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Populate with realistic BJMP demo record"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Auto-Fill Sample Record</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="border-b border-slate-800 bg-slate-950/60 px-6 py-3" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-blue-300">Step {activeStepIndex + 1} of {tabs.length}</p><h3 className="mt-0.5 text-sm font-bold text-white">{tabs[activeStepIndex]?.label.replace(/^\d+\.\s*/, '')}</h3></div>
            <span className="text-xs text-slate-400">Complete this section, then choose Next.</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${((activeStepIndex + 1) / tabs.length) * 100}%` }} /></div>
        </div>

        {/* Modal Form Body */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto p-4 text-xs sm:p-6">
          
          {/* ========================================================
              TAB 1: DEMOGRAPHICS & IDENTIFICATION
          ======================================================== */}
          {activeTab === 'DEMOGRAPHICS' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 items-start gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="min-w-0">
                  <label className="text-[10px] text-slate-300 block font-semibold">PRISONER / PDL NUMBER (AUTOMATIC)
                    <input type="text" readOnly value={pdlNumber || 'Assigned automatically when saved'} className="mt-1 block w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm font-mono font-bold text-blue-300" />
                  </label>
                  <p className="mt-1 max-w-xs text-[10px] text-slate-400">Unique system number for this PDL record. It is assigned from the database when you save.</p>
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] text-slate-300 block font-semibold">FILE NUMBER (JACKET) — OPTIONAL
                  <input
                    type="text"
                    value={fileNumber}
                    onChange={(e) => setFileNumber(e.target.value)}
                    className="block w-full font-mono text-slate-200 text-sm bg-slate-900 border border-slate-700 rounded px-2.5 py-2 mt-1 focus:outline-none focus:border-blue-400"
                  />
                  <span className="mt-1 block text-[10px] font-normal text-slate-400">Physical paper jacket or case-folder reference, if one has been assigned.</span>
                  </label>
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] text-slate-300 block font-semibold">BJMP ID NUMBER — OPTIONAL
                  <input
                    type="text"
                    value={bjmpIdNumber}
                    onChange={(e) => setBjmpIdNumber(e.target.value)}
                    className="block w-full font-mono text-slate-200 text-sm bg-slate-900 border border-slate-700 rounded px-2.5 py-2 mt-1 focus:outline-none focus:border-blue-400"
                  />
                  <span className="mt-1 block text-[10px] font-normal text-slate-400">Official BJMP identification number already assigned to the PDL, if available.</span>
                  </label>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-semibold">CURRENT STATUS</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PDL['status'])}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-200 focus:outline-none focus:border-blue-400"
                  >
                    <option value="In Custody">In Custody</option>
                    <option value="On Trial">On Trial</option>
                    <option value="Sentenced">Sentenced</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Released">Released</option>
                  </select>
                </div>
              </div>

              {status === 'Released' && <div className="mb-3 grid gap-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold text-amber-100">Release date</label><input type="date" required value={releaseDate} onChange={e=>setReleaseDate(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm"/></div><div><label className="mb-1 block text-xs font-semibold text-amber-100">Mode of release</label><input required value={releaseMode} onChange={e=>setReleaseMode(e.target.value)} placeholder="Court order, bail, sentence served…" className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm"/></div><p className="text-xs text-amber-100 sm:col-span-2">Saving Released records this action as administrator approval and includes the details on the discharge certificate and monthly register.</p></div>}
              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Last Name (Apelyido) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dela Cruz"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">First Name (Pangalan) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Juan"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Middle Name (Gitnang Pangalan)</label>
                  <input
                    type="text"
                    placeholder="e.g. Santos"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Suffix</label>
                  <input
                    type="text"
                    placeholder="Jr., Sr., III"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="sm:col-span-2 xl:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Alias / Nickname / "A.K.A."</label>
                  <input
                    type="text"
                    placeholder='e.g. Johnny / "Totoy Bato"'
                    value={aliases}
                    onChange={(e) => setAliases(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Sex *</label>
                  <select
                    value={sex}
                    onChange={(e) => {
                      const nextSex = e.target.value as 'Male' | 'Female';
                      setSex(nextSex);
                      setJailFacilityId(nextSex === 'Female' ? 'imus-city-jail-female' : 'imus-city-jail-male');
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Civil Status *</label>
                  <select
                    value={civilStatus}
                    onChange={(e) => setCivilStatus(e.target.value as MaritalStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                    <option value="Divorced">Divorced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-1 block font-semibold text-slate-300">Date of birth *</label>
                  <input
                    type="date"
                    required
                    min="1900-01-01"
                    max={todayInManila()}
                    autoComplete="bday"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Age at Admission *</label>
                  <input
                    type="number"
                    min={18}
                    max={99}
                    required
                    value={ageAtAdmission||''}
                    onChange={(e) => setAgeAtAdmission(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Citizenship</label>
                  <input
                    type="text"
                    value={citizenship}
                    onChange={(e) => setCitizenship(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Place of Birth</label>
                  <input
                    type="text"
                    value={placeOfBirth}
                    onChange={(e) => setPlaceOfBirth(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Religion</label>
                  <input
                    type="text"
                    placeholder="Roman Catholic, Iglesia ni Cristo, Islam, etc."
                    value={religion}
                    onChange={(e) => setReligion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tribal Affiliation (Katutubo / Etniko)</label>
                  <input
                    type="text"
                    placeholder="Tagalog, Ilocano, Bicolano, Cebuano, etc."
                    value={tribalAffiliation}
                    onChange={(e) => setTribalAffiliation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <AddressFields value={presentAddress} onChange={setPresentAddress} legend="Present residential address *" className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 focus:outline-none focus:border-blue-400" />
                <AddressFields value={provincialAddress} onChange={setProvincialAddress} required={false} legend="Provincial permanent address (optional)" className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 focus:outline-none focus:border-blue-400" />
              </div>

              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Highest Educational Attainment</label>
                  <select
                    value={highestEducationalAttainment}
                    onChange={(e) => setHighestEducationalAttainment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  >
                    <option value="Elementary Undergraduate">Elementary Undergraduate</option>
                    <option value="Elementary Graduate">Elementary Graduate</option>
                    <option value="High School Undergraduate">High School Undergraduate</option>
                    <option value="High School Graduate">High School Graduate</option>
                    <option value="Vocational / Technical">Vocational / Technical</option>
                    <option value="College Undergraduate">College Undergraduate</option>
                    <option value="College Graduate">College Graduate</option>
                    <option value="Post-Graduate / Masteral">Post-Graduate / Masteral</option>
                    <option value="None / Illiterate">None / Illiterate</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Course / Major</label>
                  <input
                    type="text"
                    placeholder="e.g. BS Criminology, HRM, N/A"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Occupation (Hanapbuhay)</label>
                  <input
                    type="text"
                    placeholder="e.g. Jeepney Driver, Electrician, Vendor"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Special Skills / Talents</label>
                  <input
                    type="text"
                    placeholder="Carpentry, Electrical, Culinary, Tailoring, Music"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Gang / Group Affiliation (Pangkat)</label>
                  <input type="text" maxLength={200} value={gangGroupAffiliation} onChange={(e) => setGangGroupAffiliation(e.target.value)} placeholder="Type the group name, Non-Affiliated, or Unknown" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400" />
                  <p className="mt-1 text-[10px] text-slate-400">Enter any current affiliation, even if it is not listed elsewhere.</p>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              TAB 2: PHYSICAL & BERTILLION / TATTOOS
          ======================================================== */}
          {activeTab === 'PHYSICAL' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Physical Description & Anthropometric Identification</h4>
                  <p className="text-[11px] text-slate-400">Official BJMP Inmate Identification Sheet & Bertillion Classification</p>
                </div>
                <div className="text-right font-mono text-blue-400 text-xs">
                  ICJ-MD-BERTILLION
                </div>
              </div>

              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Height (Taas)</label>
                  <input
                    type="text"
                    placeholder={'e.g. 5\'7" (170 cm)'}
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Weight (Timbang)</label>
                  <input
                    type="text"
                    placeholder="e.g. 68 kg (150 lbs)"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Body Built (Pangangatawan)</label>
                  <select
                    value={built}
                    onChange={(e) => setBuilt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  >
                    <option value="Medium Built">Medium Built</option>
                    <option value="Slim">Slim</option>
                    <option value="Muscular">Muscular</option>
                    <option value="Heavy / Stocky">Heavy / Stocky</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Complexion (Kulay)</label>
                  <select
                    value={complexion}
                    onChange={(e) => setComplexion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  >
                    <option value="Brown / Kayumanggi">Brown / Kayumanggi</option>
                    <option value="Fair / Maputi">Fair / Maputi</option>
                    <option value="Dark / Maitim">Dark / Maitim</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Eyes (Mata)</label>
                  <input
                    type="text"
                    placeholder="Brown, Black"
                    value={eyes}
                    onChange={(e) => setEyes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Hair (Buhok)</label>
                  <input
                    type="text"
                    placeholder="Black wavy, Short straight"
                    value={hair}
                    onChange={(e) => setHair(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Blood Type</label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="Unknown">Unknown / Pending Lab</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Dialects Spoken</label>
                  <input
                    type="text"
                    placeholder="Tagalog, English, Ilocano"
                    value={dialectsSpoken}
                    onChange={(e) => setDialectsSpoken(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Bertillion Marks: Tattoos, Scars, Moles, Amputations, Deformities *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail exact location and description of tattoos, birthmarks, and scars (e.g. Tribal dragon on left shoulder; 5cm surgical scar on appendectomy site; Cross tattoo on right forearm)..."
                  value={bertillionMarks}
                  onChange={(e) => setBertillionMarks(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-400"
                />
              </div>

              <BodyMarkPicker marks={bodyMarks} onChange={setBodyMarks} />

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Mannerisms / Idiosyncrasies</label>
                <input
                  type="text"
                  placeholder="e.g. Frequent blinking, throat clearing, none noted"
                  value={mannerism}
                  onChange={(e) => setMannerism(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                />
              </div>

            </div>
          )}

          {/* ========================================================
              TAB 3: FAMILY & NEAREST KIN
          ======================================================== */}
          {activeTab === 'FAMILY' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Spouse / Live-in Partner Name</label>
                  <input
                    type="text"
                    placeholder="Full legal name of spouse/partner"
                    value={spouseName}
                    onChange={(e) => setSpouseName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">No. of Children</label>
                    <input
                      type="number"
                      min={0}
                      value={numberOfChildren}
                      onChange={(e) => setNumberOfChildren(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Children Names & Ages</label>
                    <input
                      type="text"
                      placeholder="e.g. John (7), Mary (4)"
                      value={childrenNamesStr}
                      onChange={(e) => setChildrenNamesStr(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Father's Full Name (Pangalan ng Ama)</label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <AddressFields value={fatherAddress} onChange={setFatherAddress} required={false} legend="Father's address (optional)" className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 focus:outline-none focus:border-blue-400" />
              </div>

              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Mother's Full Maiden Name (Pangalan ng Ina)</label>
                  <input
                    type="text"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <AddressFields value={motherAddress} onChange={setMotherAddress} required={false} legend="Mother's address (optional)" className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 focus:outline-none focus:border-blue-400" />
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-blue-300 text-xs uppercase tracking-wider">
                  Emergency Contact / Nearest Kin (Tatawagan kung may Emergency)
                </h4>
                <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Contact Person *</label>
                    <input
                      type="text"
                      required
                      value={emergencyContactPerson}
                      onChange={(e) => setEmergencyContactPerson(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Relationship to PDL</label>
                    <input
                      type="text"
                      value={emergencyContactRelation}
                      onChange={(e) => setEmergencyContactRelation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Contact Phone Number *</label>
                    <MobileInput required value={emergencyContactPhone} onChange={setEmergencyContactPhone} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-100 focus:outline-none focus:border-blue-400" />
                  </div>
                </div>
                <AddressFields value={emergencyContactAddress} onChange={setEmergencyContactAddress} required={false} legend="Emergency contact address (optional)" className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 focus:outline-none focus:border-blue-400" />
              </div>

            </div>
          )}

          {/* ========================================================
              TAB 4: ARREST & BOOKING INTAKE
          ======================================================== */}
          {activeTab === 'ARREST' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Date Committed to BJMP (Petsa ng Pagpasok) *</label>
                  <input
                    type="date"
                    required
                    value={dateCommitted}
                    onChange={(e) => setDateCommitted(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Time & Date of Arrest (PNP / NBI / PDEA)</label>
                  <input
                    type="text"
                    placeholder="e.g. 2025-01-14 10:30 PM"
                    value={timeAndDateOfArrest}
                    onChange={(e) => setTimeAndDateOfArrest(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Place of Arrest (Lugar ng Pagkaaresto)</label>
                  <input
                    type="text"
                    placeholder="e.g. Aguinaldo Highway, Imus City, Cavite"
                    value={placeOfArrest}
                    onChange={(e) => setPlaceOfArrest(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Arresting Officer / Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. PCpl. Ronald Gomez (Imus City Police Station)"
                    value={arrestingOfficer}
                    onChange={(e) => setArrestingOfficer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Time & Date of Detention (LEA Custodial)</label>
                  <input
                    type="text"
                    placeholder="e.g. 2025-01-15 01:30 AM (Imus Police Station)"
                    value={timeDateOfDetentionLea}
                    onChange={(e) => setTimeDateOfDetentionLea(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">BJMP Receiving Officer *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JO1 Aldrin M. Mangampo"
                    value={receivingOfficer}
                    onChange={(e) => setReceivingOfficer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Strip & Physical Search Conducted By</label>
                  <input
                    type="text"
                    placeholder="e.g. JO2 Roberto S. Bautista"
                    value={searchedBy}
                    onChange={(e) => setSearchedBy(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-blue-300 text-xs uppercase tracking-wider">
                  Facility Housing & Cell / Brigada Assignment
                </h4>
                <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Designated Jail Facility</label>
                    <select
                      required
                      value={jailFacilityId}
                      onChange={(e) => setJailFacilityId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                    >
                      {IMUS_PDL_FACILITIES.map((f) => (
                        <option key={f.id} value={f.id} disabled={f.id !== (sex === 'Female' ? 'imus-city-jail-female' : 'imus-city-jail-male')}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Cell / Brigada Assignment *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Brigada 3 - Cell Dorm B"
                      value={cellDormitory}
                      onChange={(e) => setCellDormitory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400 font-bold text-blue-300"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              TAB 5: COURT & CRIMINAL CASES
          ======================================================== */}
          {activeTab === 'LEGAL' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-blue-400" />
                  Primary Criminal Case & Judicial Information
                </h4>

                <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Criminal Case Number *</label>
                    <div className="flex overflow-hidden rounded-lg border border-slate-700 bg-slate-900 focus-within:border-blue-400">
                      <span className="flex items-center border-r border-slate-700 px-3 font-mono font-bold text-blue-300">CC-</span>
                      <input
                        type="text"
                        required
                        maxLength={60}
                        placeholder="e.g. 24-10294"
                        value={caseNumberSuffix}
                        onChange={(e) => setCaseNumberSuffix(e.target.value.replace(/^CC-/i, ''))}
                        className="min-w-0 flex-1 bg-transparent p-2 font-mono font-bold text-slate-100 focus:outline-none"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">Enter the remaining number as it appears on the court papers. CC- is added automatically.</p>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Counts (Bilang ng Kaso)</label>
                    <input
                      type="number"
                      min={1}
                      value={counts1}
                      onChange={(e) => setCounts1(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Date Crime Committed</label>
                    <input
                      type="date"
                      value={dateCrimeCommitted}
                      onChange={(e) => setDateCrimeCommitted(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Offense Charged / Violation (Krimen / Nilabag) *</label>
                  <input
                    type="text"
                    required
                    list="pdl-charged-violation-suggestions"
                    placeholder="e.g. Violation of Sec. 11, Art. II of R.A. 9165 (Comprehensive Dangerous Drugs Act)"
                    value={primaryOffense}
                    onChange={(e) => setPrimaryOffense(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400 font-medium"
                  />
                  <datalist id="pdl-charged-violation-suggestions">
                    {CHARGED_VIOLATION_SUGGESTIONS.map((offense) => <option key={offense} value={offense} />)}
                  </datalist>
                  <p className="mt-1 text-[11px] text-slate-400">Choose a suggestion or type the exact charge from the court papers.</p>
                </div>

                <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Court & Branch *</label>
                    <input
                      type="text"
                      required
                      list="imus-court-branch-suggestions"
                      placeholder="e.g. RTC Branch 20, Imus City, Cavite"
                      value={courtBranch}
                      onChange={(e) => setCourtBranch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                    />
                    <datalist id="imus-court-branch-suggestions">
                      {IMUS_COURT_BRANCH_SUGGESTIONS.map((court) => <option key={court} value={court} />)}
                    </datalist>
                    <p className="mt-1 text-[11px] text-slate-400">Suggestions cover Imus courts; you can type another nearby court and branch.</p>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Presiding Judge</label>
                    <input
                      type="text"
                      placeholder="e.g. Hon. Amy Ana L. De Villa-Rosales"
                      value={presidingJudge}
                      onChange={(e) => setPresidingJudge(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Current Judicial Case Status</label>
                  <input
                    type="text"
                    placeholder="e.g. Under Trial, Arraignment, Pre-Trial, Promulgated"
                    value={caseStatus}
                    onChange={(e) => setCaseStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Hearing Status Checklist (Photo 9) */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <span className="font-bold text-blue-300 text-xs uppercase tracking-wider block">
                  Hearing Status Checklist (Official PDL Jacket Tracker)
                </span>
                <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <label className="flex items-center space-x-2 bg-slate-900 p-2 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stageArraignment}
                      onChange={(e) => setStageArraignment(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-slate-200">Arraignment</span>
                  </label>
                  <label className="flex items-center space-x-2 bg-slate-900 p-2 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stagePreTrial}
                      onChange={(e) => setStagePreTrial(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-slate-200">Pre-Trial</span>
                  </label>
                  <label className="flex items-center space-x-2 bg-slate-900 p-2 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stageTrial}
                      onChange={(e) => setStageTrial(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-slate-200">Trial</span>
                  </label>
                  <label className="flex items-center space-x-2 bg-slate-900 p-2 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stageProsecution}
                      onChange={(e) => setStageProsecution(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-slate-200">Prosecution Evidence</span>
                  </label>
                  <label className="flex items-center space-x-2 bg-slate-900 p-2 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stageDefense}
                      onChange={(e) => setStageDefense(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-slate-200">Defense Evidence</span>
                  </label>
                  <label className="flex items-center space-x-2 bg-slate-900 p-2 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stageDecision}
                      onChange={(e) => setStageDecision(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-slate-200">Decision / Promulgation</span>
                  </label>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              TAB 6: PROPERTY RECEIPT
          ======================================================== */}
          {activeTab === 'PROPERTY' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 items-end gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <h4 className="font-bold text-white text-sm">PDL's Property Receipt / Declaration of Valuables</h4>
                  <p className="text-[11px] text-slate-400">
                    Official BJMP form for inmate items surrendered upon booking, stored in safe custodial custody
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold">RECEIPT #</span>
                  <input
                    type="text"
                    readOnly
                    value={propertyReceiptNumber || (propertyReceiptLoading ? 'Checking sequence…' : 'Assigned when saved')}
                    className="w-48 font-mono font-bold text-blue-300 text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1"
                  />
                  <span className="mt-1 block text-[10px] text-slate-400">Assigned from the next database receipt number when saved.</span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-300 text-xs uppercase tracking-wider">Itemized Valuables Deposited</span>
                  <button
                    type="button"
                    onClick={handleAddPropertyItem}
                    className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {propertyItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto]">
                      <input
                        type="text"
                        placeholder="Unit (e.g. 1 pc, 1 unit, PHP)"
                        value={item.unit}
                        onChange={(e) => handleUpdatePropertyItem(idx, 'unit', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
                      />
                      <input
                        type="text"
                        placeholder="Description (e.g. Casio digital watch silver strap, Black wallet with PhilSys ID)"
                        value={item.description}
                        onChange={(e) => handleUpdatePropertyItem(idx, 'description', e.target.value)}
                        className="min-w-0 w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePropertyItem(idx)}
                        className="justify-self-end self-center p-2 text-slate-500 hover:text-rose-400 cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-slate-500 italic pt-2">
                  * Note: Property receipt to be prepared in duplicate. Inmate property will be securely locked and returned upon release.
                </p>
              </div>

            </div>
          )}

          {/* ========================================================
              TAB 7: GCTA & LEGAL DOCUMENTS CHECKLIST
          ======================================================== */}
          {activeTab === 'DOCUMENTS' && (
            <div className="space-y-4">
              
              {/* RA 10592 (Photo 10) */}
              <div className="bg-slate-950 p-4 rounded-xl border border-blue-500/30 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-blue-300 text-sm">
                      Manipesto ng Detenido (R.A. 10592 - Good Conduct Time Allowance / GCTA)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Voluntary formal manifestation by the detainee agreeing in writing to abide by BJMP discipline rules
                    </p>
                  </div>
                  <label className="flex items-center space-x-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ra10592Signed}
                      onChange={(e) => setRa10592Signed(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span className="font-bold text-blue-300 text-xs">SIGNED & CERTIFIED</span>
                  </label>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg text-[11px] text-slate-300 leading-relaxed font-serif border border-slate-800">
                  "Kusang loob na sumasang-ayon at susunod sa mga alituntunin at regulasyong ipinatutupad sa loob ng
                  BJMP Imus City Jail - Male Dormitory alinsunod sa probisyon ng Republic Act 10592 upang maging karapat-dapat
                  sa mga bawas-parusa (GCTA) na itinatadhana ng batas."
                </div>
              </div>

              {/* Mandatory Documents Checklist (Photo 9) */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                  Mandatory Booking Documents on File (Checklist)
                </h4>
                
                <div className="grid grid-cols-1 items-start gap-2.5 sm:grid-cols-2">
                  <label className="flex items-center space-x-2.5 bg-slate-900 p-2.5 rounded-lg border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chkMittimus}
                      onChange={(e) => setChkMittimus(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-slate-200 font-medium">Mittimus / Order of Commitment</span>
                  </label>

                  <label className="flex items-center space-x-2.5 bg-slate-900 p-2.5 rounded-lg border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chkCourtOrder}
                      onChange={(e) => setChkCourtOrder(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-slate-200 font-medium">Court Order / Information Sheet</span>
                  </label>

                  <label className="flex items-center space-x-2.5 bg-slate-900 p-2.5 rounded-lg border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chkNonPending}
                      onChange={(e) => setChkNonPending(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-slate-200 font-medium">Certificate of Non-Pending Case (RTC/MTCC)</span>
                  </label>

                  <label className="flex items-center space-x-2.5 bg-slate-900 p-2.5 rounded-lg border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chkCommitmentInfo}
                      onChange={(e) => setChkCommitmentInfo(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-slate-200 font-medium">Commitment Information Sheet</span>
                  </label>

                  <label className="flex items-center space-x-2.5 bg-slate-900 p-2.5 rounded-lg border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chkGctaCalc}
                      onChange={(e) => setChkGctaCalc(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-slate-200 font-medium">Computation of GCTA Sheet</span>
                  </label>

                  <label className="flex items-center space-x-2.5 bg-slate-900 p-2.5 rounded-lg border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chkCertDetention}
                      onChange={(e) => setChkCertDetention(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-slate-200 font-medium">Certificate of Detention Form</span>
                  </label>

                  <label className="flex items-center space-x-2.5 bg-slate-900 p-2.5 rounded-lg border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chkHealthCert}
                      onChange={(e) => setChkHealthCert(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-slate-200 font-medium">Medical & Physical Health Clearance</span>
                  </label>

                  <label className="flex items-center space-x-2.5 bg-slate-900 p-2.5 rounded-lg border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chkDde}
                      onChange={(e) => setChkDde(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-slate-200 font-medium">Drug Dependency Examination (DDE Result)</span>
                  </label>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'DOCUMENTS' && <SignatureCapture value={signatureDataUrl} onChange={setSignatureDataUrl} label="PDL registration signature" />}

          {/* Modal Footer Controls */}
          {saveError&&<p role="alert" className="text-sm text-rose-300">{saveError}</p>}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-slate-400">Step {activeStepIndex + 1} of {tabs.length} · * BJMP booking and records details</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} disabled={saving} className="rounded-lg bg-slate-800 px-4 py-2 text-slate-300 hover:bg-slate-700">Cancel</button>
              {activeStepIndex > 0 && <button type="button" onClick={() => moveStep(-1)} disabled={saving} className="rounded-lg border border-slate-600 px-4 py-2 text-slate-200 hover:bg-slate-800">Previous</button>}
              {activeStepIndex < tabs.length - 1 ? <button type="button" onClick={() => moveStep(1)} disabled={saving} className="rounded-lg bg-blue-500 px-5 py-2 font-bold text-slate-950 hover:bg-blue-400">Next</button> : <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-5 py-2 font-bold text-slate-950 shadow-lg shadow-blue-500/20 hover:bg-blue-400"><Check className="w-4 h-4" /><span>{saving?'Saving…':existingPdl ? 'Save Updated Booking' : 'Complete & Register PDL'}</span></button>}
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
