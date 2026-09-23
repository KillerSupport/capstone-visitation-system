import React, { useState } from 'react';
import {
  X, UserPlus, FileText, Shield, User, MapPin, Scale,
  Check, AlertTriangle, Sparkles, Plus, Trash2, Camera,
  Package, Calendar, CheckSquare, Fingerprint
} from 'lucide-react';
import { PDL, MaritalStatus, PDLBodyMark } from '../../types';
import { BJMP_JAIL_FACILITIES } from '../../data/bjmpData';
import { BodyMarkPicker } from './BodyMarkPicker';

interface PDLRegistrationModalProps {
  onClose: () => void;
  onSave: (pdl: PDL) => void;
  existingPdl?: PDL | null;
}

type TabKey = 'DEMOGRAPHICS' | 'PHYSICAL' | 'FAMILY' | 'ARREST' | 'LEGAL' | 'PROPERTY' | 'DOCUMENTS';

export const PDLRegistrationModal: React.FC<PDLRegistrationModalProps> = ({
  onClose,
  onSave,
  existingPdl,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('DEMOGRAPHICS');

  // Identification & Demographics
  const [lastName, setLastName] = useState(existingPdl?.lastName || '');
  const [firstName, setFirstName] = useState(existingPdl?.firstName || '');
  const [middleName, setMiddleName] = useState(existingPdl?.middleName || '');
  const [suffix, setSuffix] = useState(existingPdl?.suffix || '');
  const [aliases, setAliases] = useState(existingPdl?.aliases || '');
  const [pdlNumber, setPdlNumber] = useState(
    existingPdl?.pdlNumber || `PDL-2025-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [fileNumber, setFileNumber] = useState(
    existingPdl?.fileNumber || `FN-2025-${Math.floor(100 + Math.random() * 900)}`
  );
  const [bjmpIdNumber, setBjmpIdNumber] = useState(
    existingPdl?.bjmpIdNumber || `BJMP-R4A-ICJ-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [sex, setSex] = useState<'Male' | 'Female'>(existingPdl?.sex || 'Male');
  const [dateOfBirth, setDateOfBirth] = useState(existingPdl?.dateOfBirth || '1996-05-12');
  const [ageAtAdmission, setAgeAtAdmission] = useState<number>(existingPdl?.ageAtAdmission || 29);
  const [placeOfBirth, setPlaceOfBirth] = useState(existingPdl?.placeOfBirth || 'Imus City, Cavite');
  const [civilStatus, setCivilStatus] = useState<MaritalStatus>(existingPdl?.civilStatus || 'Single');
  const [citizenship, setCitizenship] = useState(existingPdl?.citizenship || 'Filipino');
  const [religion, setReligion] = useState(existingPdl?.religion || 'Roman Catholic');
  const [tribalAffiliation, setTribalAffiliation] = useState(existingPdl?.tribalAffiliation || 'Tagalog');
  const [presentAddress, setPresentAddress] = useState(
    existingPdl?.presentAddress || 'Brgy. Malagasang 1-G, Imus City, Cavite'
  );
  const [provincialAddress, setProvincialAddress] = useState(
    existingPdl?.provincialAddress || 'Brgy. San Agustin, Dasmariñas City, Cavite'
  );
  const [highestEducationalAttainment, setHighestEducationalAttainment] = useState(
    existingPdl?.highestEducationalAttainment || 'College Undergraduate'
  );
  const [course, setCourse] = useState(existingPdl?.course || 'BS Hotel & Restaurant Management');
  const [occupation, setOccupation] = useState(existingPdl?.occupation || 'Delivery Driver');
  const [skills, setSkills] = useState(existingPdl?.skills || 'Driving, Appliance Repair');
  const [gangGroupAffiliation, setGangGroupAffiliation] = useState(
    existingPdl?.gangGroupAffiliation || 'Non-Affiliated (Neutral)'
  );

  // Physical & Bertillion
  const [height, setHeight] = useState(existingPdl?.height || '5\'7" (170 cm)');
  const [weight, setWeight] = useState(existingPdl?.weight || '65 kg (143 lbs)');
  const [built, setBuilt] = useState(existingPdl?.built || 'Medium Built');
  const [complexion, setComplexion] = useState(existingPdl?.complexion || 'Brown / Kayumanggi');
  const [eyes, setEyes] = useState(existingPdl?.eyes || 'Brown');
  const [hair, setHair] = useState(existingPdl?.hair || 'Black / Short wavy');
  const [bloodType, setBloodType] = useState(existingPdl?.bloodType || 'O+');
  const [mannerism, setMannerism] = useState(existingPdl?.mannerism || 'None');
  const [dialectsSpoken, setDialectsSpoken] = useState(existingPdl?.dialectsSpoken || 'Tagalog, English');
  const [bertillionMarks, setBertillionMarks] = useState(
    existingPdl?.bertillionMarks || 'Tribal feather tattoo on left shoulder; 2-inch scar on right forearm'
  );
  const [bodyMarks, setBodyMarks] = useState<PDLBodyMark[]>(existingPdl?.bodyMarks || []);

  // Family & Emergency
  const [spouseName, setSpouseName] = useState(existingPdl?.spouseName || '');
  const [fatherName, setFatherName] = useState(existingPdl?.fatherName || 'Danilo S. Bautista');
  const [fatherAddress, setFatherAddress] = useState(existingPdl?.fatherAddress || 'Imus City, Cavite');
  const [motherName, setMotherName] = useState(existingPdl?.motherName || 'Corazon M. Bautista');
  const [motherAddress, setMotherAddress] = useState(existingPdl?.motherAddress || 'Imus City, Cavite');
  const [numberOfChildren, setNumberOfChildren] = useState<number>(existingPdl?.numberOfChildren || 0);
  const [childrenNamesStr, setChildrenNamesStr] = useState(existingPdl?.childrenNames?.join(', ') || '');
  const [emergencyContactPerson, setEmergencyContactPerson] = useState(
    existingPdl?.emergencyContactPerson || 'Corazon M. Bautista'
  );
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(
    existingPdl?.emergencyContactRelation || 'Mother'
  );
  const [emergencyContactAddress, setEmergencyContactAddress] = useState(
    existingPdl?.emergencyContactAddress || 'Brgy. Malagasang 1-G, Imus City, Cavite'
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    existingPdl?.emergencyContactPhone || '+63 917 555 1290'
  );

  // Arrest & Intake
  const [dateCommitted, setDateCommitted] = useState(
    existingPdl?.dateCommitted || new Date().toISOString().split('T')[0]
  );
  const [timeAndDateOfArrest, setTimeAndDateOfArrest] = useState(
    existingPdl?.timeAndDateOfArrest || '2025-01-14 09:30 PM'
  );
  const [placeOfArrest, setPlaceOfArrest] = useState(
    existingPdl?.placeOfArrest || 'Aguinaldo Highway, Imus City, Cavite'
  );
  const [arrestingOfficer, setArrestingOfficer] = useState(
    existingPdl?.arrestingOfficer || 'PCpl. Ronald Gomez (Imus CPS)'
  );
  const [timeDateOfDetentionLea, setTimeDateOfDetentionLea] = useState(
    existingPdl?.timeDateOfDetentionLea || '2025-01-14 11:45 PM (Imus Police Station Custodial Facility)'
  );
  const [receivingOfficer, setReceivingOfficer] = useState(
    existingPdl?.receivingOfficer || 'JO1 Aldrin M. Mangampo'
  );
  const [searchedBy, setSearchedBy] = useState(existingPdl?.searchedBy || 'JO2 Roberto S. Bautista');
  const [jailFacilityId, setJailFacilityId] = useState(
    existingPdl?.jailFacilityId || 'imus-city-jail-male'
  );
  const [cellDormitory, setCellDormitory] = useState(
    existingPdl?.cellDormitory || 'Brigada 2 - Selda C'
  );
  const [status, setStatus] = useState<PDL['status']>(existingPdl?.status || 'In Custody');

  // Legal & Court
  const [primaryOffense, setPrimaryOffense] = useState(
    existingPdl?.primaryOffense || 'Violation of Sec. 11, Art. II of R.A. 9165'
  );
  const [caseNumber1, setCaseNumber1] = useState(
    existingPdl?.cases?.[0]?.caseNumber || `CC-25-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [counts1, setCounts1] = useState<number>(existingPdl?.cases?.[0]?.counts || 1);
  const [dateCrimeCommitted, setDateCrimeCommitted] = useState(
    existingPdl?.dateCrimeCommitted || '2025-01-12'
  );
  const [courtBranch, setCourtBranch] = useState(
    existingPdl?.courtBranch || 'RTC Branch 20, Imus City, Cavite'
  );
  const [presidingJudge, setPresidingJudge] = useState(
    existingPdl?.presidingJudge || 'Hon. Amy Ana L. De Villa-Rosales'
  );
  const [caseStatus, setCaseStatus] = useState(existingPdl?.caseStatus || 'Under Trial (Arraignment)');
  const [stageArraignment, setStageArraignment] = useState(existingPdl?.hearingStage?.arraignment ?? true);
  const [stagePreTrial, setStagePreTrial] = useState(existingPdl?.hearingStage?.preTrial ?? false);
  const [stageTrial, setStageTrial] = useState(existingPdl?.hearingStage?.trial ?? false);
  const [stageProsecution, setStageProsecution] = useState(existingPdl?.hearingStage?.prosecutionEvidence ?? false);
  const [stageDefense, setStageDefense] = useState(existingPdl?.hearingStage?.defenseEvidence ?? false);
  const [stageDecision, setStageDecision] = useState(existingPdl?.hearingStage?.decision ?? false);

  // Property Receipt items
  const [propertyItems, setPropertyItems] = useState<{ unit: string; description: string }[]>(
    existingPdl?.propertyReceipt?.items || [
      { unit: '1 unit', description: 'Wristwatch Casio digital black strap' },
      { unit: '1 pc', description: 'Leather wallet containing PhilSys ID & PhilHealth card' },
      { unit: 'PHP', description: 'Cash amounting to One Thousand Four Hundred Pesos (Php 1,400.00)' },
    ]
  );
  const [propertyReceiptNumber, setPropertyReceiptNumber] = useState(
    existingPdl?.propertyReceipt?.receiptNumber || `PR-2025-${Math.floor(1000 + Math.random() * 9000)}`
  );

  // Documents Checklist & GCTA
  const [chkMittimus, setChkMittimus] = useState(existingPdl?.documentsChecklist?.mitimus ?? true);
  const [chkCourtOrder, setChkCourtOrder] = useState(existingPdl?.documentsChecklist?.judgementCourtOrder ?? true);
  const [chkNonPending, setChkNonPending] = useState(existingPdl?.documentsChecklist?.nonPendingCertificate ?? true);
  const [chkCommitmentInfo, setChkCommitmentInfo] = useState(existingPdl?.documentsChecklist?.commitmentInformation ?? true);
  const [chkGctaCalc, setChkGctaCalc] = useState(existingPdl?.documentsChecklist?.computationOfGcta ?? true);
  const [chkCertDetention, setChkCertDetention] = useState(existingPdl?.documentsChecklist?.certificateOfDetention ?? true);
  const [chkHealthCert, setChkHealthCert] = useState(existingPdl?.documentsChecklist?.healthCertificates ?? true);
  const [chkDde, setChkDde] = useState(existingPdl?.documentsChecklist?.ddeResult ?? true);
  const [ra10592Signed, setRa10592Signed] = useState(existingPdl?.ra10592ManifestationSigned ?? true);

  // Quick fill sample data helper
  const handleQuickFillDemo = () => {
    setLastName('Villarama');
    setFirstName('Crisanto');
    setMiddleName('Flores');
    setSuffix('');
    setAliases('Cris / "Totoy Bilis"');
    setSex('Male');
    setDateOfBirth('1994-09-28');
    setAgeAtAdmission: (30);
    setPlaceOfBirth('Imus City, Cavite');
    setCivilStatus('Married');
    setCitizenship('Filipino');
    setReligion('Roman Catholic');
    setTribalAffiliation('Tagalog');
    setPresentAddress('Blk 8 Lot 15, Greenstate Subd., Brgy. Malagasang 2-A, Imus City, Cavite');
    setProvincialAddress('Sitio Maligaya, Silang, Cavite');
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
    setFatherAddress('Brgy. Malagasang 2-A, Imus City, Cavite');
    setMotherName('Rosalinda Flores Villarama');
    setMotherAddress('Brgy. Malagasang 2-A, Imus City, Cavite');
    setNumberOfChildren(2);
    setChildrenNamesStr('Christian Villarama (7 y/o), Chloe Villarama (3 y/o)');
    setEmergencyContactPerson('Clarissa Manalo Villarama');
    setEmergencyContactRelation('Spouse');
    setEmergencyContactAddress('Blk 8 Lot 15, Greenstate Subd., Brgy. Malagasang 2-A, Imus City, Cavite');
    setEmergencyContactPhone('+63 918 321 8844');
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
    setCaseNumber1('CC-25-11840');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const constructedFullName = [firstName, middleName, lastName, suffix]
      .filter(Boolean)
      .join(' ');

    const childrenArr = childrenNamesStr
      ? childrenNamesStr.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const newPDL: PDL = {
      id: existingPdl?.id || `pdl-${Date.now()}`,
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
      ageAtAdmission: Number(ageAtAdmission) || 30,
      placeOfBirth,
      civilStatus,
      citizenship,
      religion,
      tribalAffiliation,
      presentAddress,
      provincialAddress,
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
      fatherAddress,
      motherName,
      motherAddress,
      numberOfChildren: Number(numberOfChildren) || 0,
      childrenNames: childrenArr,
      emergencyContactPerson,
      emergencyContactRelation,
      emergencyContactAddress,
      emergencyContactPhone,
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
      criminalCaseNumbers: [caseNumber1],
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
      ],
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

    onSave(newPDL);
    onClose();
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

        {/* Tab Navigation */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-6 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'border-blue-400 text-blue-400 bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          
          {/* ========================================================
              TAB 1: DEMOGRAPHICS & IDENTIFICATION
          ======================================================== */}
          {activeTab === 'DEMOGRAPHICS' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">PRISONER / PDL NUMBER</span>
                  <input
                    type="text"
                    required
                    value={pdlNumber}
                    onChange={(e) => setPdlNumber(e.target.value)}
                    className="font-mono font-bold text-blue-300 text-sm bg-slate-900 border border-slate-700 rounded px-2.5 py-1 mt-0.5 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">FILE NUMBER (JACKET)</span>
                  <input
                    type="text"
                    value={fileNumber}
                    onChange={(e) => setFileNumber(e.target.value)}
                    className="font-mono text-slate-200 text-sm bg-slate-900 border border-slate-700 rounded px-2.5 py-1 mt-0.5 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">BJMP ID NUMBER</span>
                  <input
                    type="text"
                    value={bjmpIdNumber}
                    onChange={(e) => setBjmpIdNumber(e.target.value)}
                    className="font-mono text-slate-200 text-sm bg-slate-900 border border-slate-700 rounded px-2.5 py-1 mt-0.5 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">CURRENT STATUS</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PDL['status'])}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1 mt-0.5 focus:outline-none focus:border-blue-400"
                  >
                    <option value="In Custody">In Custody</option>
                    <option value="On Trial">On Trial</option>
                    <option value="Sentenced">Sentenced</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Released">Released</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
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
                    onChange={(e) => setSex(e.target.value as 'Male' | 'Female')}
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

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Date of Birth (mm/dd/yyyy) *</label>
                  <input
                    type="date"
                    required
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
                    value={ageAtAdmission}
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
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Place of Birth</label>
                  <input
                    type="text"
                    value={placeOfBirth}
                    onChange={(e) => setPlaceOfBirth(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Present Residential Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="House/Blk/Lot, Street, Barangay, City/Municipality, Province"
                    value={presentAddress}
                    onChange={(e) => setPresentAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Provincial Permanent Address</label>
                  <input
                    type="text"
                    placeholder="Provincial address or origin..."
                    value={provincialAddress}
                    onChange={(e) => setProvincialAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <select
                    value={gangGroupAffiliation}
                    onChange={(e) => setGangGroupAffiliation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400 font-semibold"
                  >
                    <option value="Non-Affiliated (Neutral)">Non-Affiliated (Neutral / Walang Pangkat)</option>
                    <option value="Sigue-Sigue Sputnik">Sigue-Sigue Sputnik</option>
                    <option value="Batang City Jail (BCJ)">Batang City Jail (BCJ)</option>
                    <option value="Bahala Na Gang (BNG)">Bahala Na Gang (BNG)</option>
                    <option value="Commando Gang">Commando Gang</option>
                    <option value="Genuine Ilocano Gang (GIG)">Genuine Ilocano Gang (GIG)</option>
                    <option value="Batang Cebu 45">Batang Cebu 45</option>
                  </select>
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div className="grid grid-cols-2 gap-2">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Father's Full Name (Pangalan ng Ama)</label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Father's Address</label>
                  <input
                    type="text"
                    value={fatherAddress}
                    onChange={(e) => setFatherAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Mother's Full Maiden Name (Pangalan ng Ina)</label>
                  <input
                    type="text"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Mother's Address</label>
                  <input
                    type="text"
                    value={motherAddress}
                    onChange={(e) => setMotherAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-blue-300 text-xs uppercase tracking-wider">
                  Emergency Contact / Nearest Kin (Tatawagan kung may Emergency)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    <input
                      type="text"
                      required
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Complete Address of Emergency Contact</label>
                  <input
                    type="text"
                    value={emergencyContactAddress}
                    onChange={(e) => setEmergencyContactAddress(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              TAB 4: ARREST & BOOKING INTAKE
          ======================================================== */}
          {activeTab === 'ARREST' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Designated Jail Facility</label>
                    <select
                      value={jailFacilityId}
                      onChange={(e) => setJailFacilityId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                    >
                      {BJMP_JAIL_FACILITIES.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Criminal Case Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CC-24-10294"
                      value={caseNumber1}
                      onChange={(e) => setCaseNumber1(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono font-bold focus:outline-none focus:border-blue-400"
                    />
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
                    placeholder="e.g. Violation of Sec. 11, Art. II of R.A. 9165 (Comprehensive Dangerous Drugs Act)"
                    value={primaryOffense}
                    onChange={(e) => setPrimaryOffense(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Court & Branch *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. RTC Branch 20, Imus City, Cavite"
                      value={courtBranch}
                      onChange={(e) => setCourtBranch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-400"
                    />
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
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
                    value={propertyReceiptNumber}
                    onChange={(e) => setPropertyReceiptNumber(e.target.value)}
                    className="font-mono font-bold text-blue-300 text-xs bg-slate-900 border border-slate-700 rounded px-2 py-0.5"
                  />
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
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Unit (e.g. 1 pc, 1 unit, PHP)"
                        value={item.unit}
                        onChange={(e) => handleUpdatePropertyItem(idx, 'unit', e.target.value)}
                        className="w-28 bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
                      />
                      <input
                        type="text"
                        placeholder="Description (e.g. Casio digital watch silver strap, Black wallet with PhilSys ID)"
                        value={item.description}
                        onChange={(e) => handleUpdatePropertyItem(idx, 'description', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePropertyItem(idx)}
                        className="text-slate-500 hover:text-rose-400 p-2 cursor-pointer"
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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              * Official BJMP Standard Operating Procedure (SOP) on Inmate Booking & Records Management
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/20"
              >
                <Check className="w-4 h-4" />
                <span>{existingPdl ? 'Save Updated Booking' : 'Complete & Register PDL'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
