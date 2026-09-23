import React, { useState, useRef } from 'react';
import { 
  X, User, Calendar, Phone, Mail, Lock, Home,
  CreditCard, Camera, Upload, CheckCircle, ArrowRight,
  ArrowLeft, Shield, AlertCircle, Eye, EyeOff, Sparkles,
  Info
} from 'lucide-react';
import { 
  UserProfile, Gender, MaritalStatus, ValidIdType
} from '../../types';
import { 
  PHILIPPINE_MUNICIPALITIES, VALID_ID_OPTIONS,
  BJMP_JAIL_FACILITIES 
} from '../../data/bjmpData';

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterSuccess: (newUser: UserProfile) => void;
}

export const SignUpModal: React.FC<SignUpModalProps> = ({
  isOpen,
  onClose,
  onRegisterSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1: Personal Details
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('1996-06-15');
  const [gender, setGender] = useState<Gender>('Male');
  const [contactNumber, setContactNumber] = useState('+63 9');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Address
  const [houseUnitStreet, setHouseUnitStreet] = useState('');
  const [municipality, setMunicipality] = useState(PHILIPPINE_MUNICIPALITIES[0]);
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>('Single');
  const [zipCode, setZipCode] = useState('4103');

  // Step 2: Identity Verification
  const [validIdType, setValidIdType] = useState<ValidIdType>('Philippine National ID (PhilSys)');
  const [idPhotoUrl, setIdPhotoUrl] = useState<string>(
    'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80'
  );
  const [facePhotoUrl, setFacePhotoUrl] = useState<string>(
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
  );
  const [preferredFacility, setPreferredFacility] = useState(BJMP_JAIL_FACILITIES[0].id);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Webcam stream state
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamTarget, setWebcamTarget] = useState<'ID' | 'FACE'>('FACE');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!isOpen) return null;

  // Age calculation
  const calculateAge = (dobString: string) => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const currentAge = calculateAge(dateOfBirth);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please provide your First Name and Last Name.');
      return;
    }
    if (!dateOfBirth) {
      setError('Please select your Date of Birth using the calendar.');
      return;
    }
    if (currentAge < 18) {
      setError('Visitor registration requires the applicant to be at least 18 years of age.');
      return;
    }
    if (!contactNumber || contactNumber.length < 10) {
      setError('Please provide a valid Philippine contact number (+63 9XX XXX XXXX).');
      return;
    }
    if (!/^[^\s@]+@gmail\.com$/i.test(email.trim())) {
      setError('Registration requires a valid @gmail.com email address.');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
      setError('Password needs 8+ characters with uppercase, lowercase, number, and symbol.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }
    if (!houseUnitStreet.trim()) {
      setError('Please provide your House/Unit/Street address.');
      return;
    }
    if (!zipCode.trim()) {
      setError('Please enter your Zip Code.');
      return;
    }

    setCurrentStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!idPhotoUrl) {
      setError('Please upload or capture a photo of your Valid Government ID.');
      return;
    }
    if (!facePhotoUrl) {
      setError('Please capture or upload a clear photo of your face to verify your identity.');
      return;
    }
    if (!agreedToTerms) {
      setError('You must affirm the BJMP Visitor Clearance Agreement and truthfulness of information.');
      return;
    }

    // Generate reference code
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bioRef = `BJMP-BIO-2026-${randomSuffix}`;

    const newUserData: UserProfile = {
      id: `user-${Date.now()}`,
      firstName: firstName.trim(),
      middleName: middleName.trim(),
      lastName: lastName.trim(),
      suffix: suffix.trim(),
      dateOfBirth,
      gender,
      contactNumber,
      email: email.trim().toLowerCase(),
      password,
      address: {
        houseUnitStreet: houseUnitStreet.trim(),
        municipality,
        maritalStatus,
        zipCode: zipCode.trim(),
      },
      validIdType,
      idPhotoUrl,
      facePhotoUrl,
      accountStatus: 'PENDING_EMAIL', // Next step is wait for email confirmation
      biometricReferenceNumber: bioRef,
      preferredJailFacilityId: preferredFacility,
      registeredAt: new Date().toISOString(),
    };

    onRegisterSuccess(newUserData);
  };

  // File Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'ID' | 'FACE') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'ID') {
          setIdPhotoUrl(reader.result as string);
        } else {
          setFacePhotoUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Webcam Capture
  const startWebcam = async (target: 'ID' | 'FACE') => {
    setWebcamTarget(target);
    setIsWebcamActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Webcam not accessible:', err);
    }
  };

  const captureWebcamSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        if (webcamTarget === 'ID') {
          setIdPhotoUrl(dataUrl);
        } else {
          setFacePhotoUrl(dataUrl);
        }
      }
      stopWebcam();
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
  };

  // Quick fill sample data for fast evaluation
  const fillSampleData = () => {
    setFirstName('Althea');
    setMiddleName('Reyes');
    setLastName('Del Rosario');
    setSuffix('');
    setDateOfBirth('1994-08-22');
    setGender('Female');
    setContactNumber('+63 917 882 3411');
    setEmail('althea.delrosario@gmail.com');
    setPassword('SecureP@ss2026');
    setConfirmPassword('SecureP@ss2026');
    setHouseUnitStreet('Block 12 Lot 5, Golden City Subd., Brgy. Anabu II-B');
    setMunicipality('Imus City, Cavite');
    setMaritalStatus('Married');
    setZipCode('4103');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden relative my-auto">
        
        {/* Modal Top Header */}
        <div className="bg-slate-950 px-8 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-tight">BJMP Visitor Registration Portal</h3>
                <span className="bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                  Desktop Form
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Account Application for Inmate Visitation & E-Dalaw Access
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={fillSampleData}
              className="text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-300 px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Fill Sample Data</span>
            </button>
            <button
              onClick={() => {
                stopWebcam();
                onClose();
              }}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Indicator Progress */}
        <div className="bg-slate-900/90 px-8 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-8">
            <div className={`flex items-center space-x-2 font-semibold ${currentStep === 1 ? 'text-blue-400' : 'text-blue-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === 1 ? 'bg-blue-500 text-slate-950 font-bold' : 'bg-blue-500 text-slate-950 font-bold'
              }`}>
                {currentStep > 1 ? <CheckCircle className="w-4 h-4" /> : '1'}
              </div>
              <span>Step 1: Personal, Address & Account Details</span>
            </div>
            <div className="w-12 h-0.5 bg-slate-800"></div>
            <div className={`flex items-center space-x-2 font-semibold ${currentStep === 2 ? 'text-blue-400' : 'text-slate-500'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === 2 ? 'bg-blue-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
              }`}>
                2
              </div>
              <span>Step 2: Valid ID & Face Verification</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400">
            Step {currentStep} of 2 (Next: Email Confirmation)
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-8 mt-4 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-start space-x-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-8 max-h-[70vh] overflow-y-auto">
          
          {/* STEP 1: PERSONAL & CONTACT INFORMATION */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              
              {/* Section A: Full Legal Name */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 mb-3">
                  <User className="w-4 h-4" />
                  <span>Full Legal Name (as shown on Government ID)</span>
                </h4>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      First Name <span className="text-blue-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maria"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Santos"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Last Name <span className="text-blue-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dela Cruz"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Suffix
                    </label>
                    <select
                      value={suffix}
                      onChange={(e) => setSuffix(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-400"
                    >
                      <option value="">None</option>
                      <option value="Jr.">Jr.</option>
                      <option value="Sr.">Sr.</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section B: DOB, Gender, Marital Status */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 mb-3">
                  <Calendar className="w-4 h-4" />
                  <span>Demographic & Civil Status</span>
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Date of Birth (Calendar) <span className="text-blue-400">*</span>
                      </label>
                      {dateOfBirth && (
                        <span className={`text-[11px] font-bold ${currentAge >= 18 ? 'text-blue-400' : 'text-rose-400'}`}>
                          Age: {currentAge} yrs
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={dateOfBirth}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-400 [color-scheme:dark]"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Must be 18 years or older for non-custodial visitation
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Gender <span className="text-blue-400">*</span>
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as Gender)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-400"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Marital Status <span className="text-blue-400">*</span>
                    </label>
                    <select
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value as MaritalStatus)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-400"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                      <option value="Divorced">Divorced</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section C: Complete Residence Address */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 mb-3">
                  <Home className="w-4 h-4" />
                  <span>Residential Address</span>
                </h4>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-6">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      House / Unit / Street / Subdivision / Brgy <span className="text-blue-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Block 12 Lot 4, Sunflower St., Brgy. San Antonio"
                      value={houseUnitStreet}
                      onChange={(e) => setHouseUnitStreet(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Municipality / City <span className="text-blue-400">*</span>
                    </label>
                    <select
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-400"
                    >
                      {PHILIPPINE_MUNICIPALITIES.map((mun) => (
                        <option key={mun} value={mun}>
                          {mun}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Zip Code <span className="text-blue-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      placeholder="e.g. 1000"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 text-center font-mono focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              </div>

              {/* Section D: Contact & Security Credentials */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 mb-3">
                  <Lock className="w-4 h-4" />
                  <span>Contact Information & Account Password</span>
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Contact Number <span className="text-blue-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="+63 9XX XXX XXXX"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email Address <span className="text-blue-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. visitor@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Use a valid @gmail.com address. A confirmation email will be sent here in the next step.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Password (Minimum 8 characters) <span className="text-blue-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="8+ chars: Aa1@..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Confirm Password <span className="text-blue-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {password && confirmPassword && (
                      <span className={`text-[10px] mt-1 block ${password === confirmPassword ? 'text-blue-400' : 'text-rose-400'}`}>
                        {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-xs flex items-center space-x-2 shadow-lg shadow-blue-500/10 transition-colors cursor-pointer"
                >
                  <span>Proceed to Step 2: Valid ID & Face Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: VALID ID (DROPDOWN), PHOTO OF VALID ID & FACE TO CONFIRM IDENTITY */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              
              {/* Header Notice */}
              <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-4 flex items-start space-x-3 text-xs text-slate-300">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-300 block font-bold text-sm">
                    BJMP Identity Verification Standard (KYC)
                  </strong>
                  <p className="mt-0.5 text-slate-300 leading-relaxed">
                    Per BJMP Standard Operating Procedure No. 2024-03, all visitors must provide a clear copy of a valid government-issued photo ID and a clear photograph of their face.
                  </p>
                </div>
              </div>

              {/* Facility Selection for In-Person Biometrics */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Designated BJMP Jail Facility (for in-person biometric scanning & visiting) <span className="text-blue-400">*</span>
                </label>
                <select
                  value={preferredFacility}
                  onChange={(e) => setPreferredFacility(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-400"
                >
                  {BJMP_JAIL_FACILITIES.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name} – {fac.address}
                    </option>
                  ))}
                </select>
              </div>

              {/* Valid ID Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valid Government ID Type <span className="text-blue-400">*</span>
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <select
                    value={validIdType}
                    onChange={(e) => setValidIdType(e.target.value as ValidIdType)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-400"
                  >
                    {VALID_ID_OPTIONS.map((idType) => (
                      <option key={idType} value={idType}>
                        {idType}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Webcam preview if active */}
              {isWebcamActive && (
                <div className="bg-slate-950 border border-blue-500/50 rounded-xl p-4 text-center">
                  <div className="text-xs font-bold text-blue-400 mb-2 flex items-center justify-center gap-1.5">
                    <Camera className="w-4 h-4 animate-pulse" />
                    <span>Live Camera Capture: {webcamTarget === 'ID' ? 'Valid Government ID' : 'Visitor Facial Photo'}</span>
                  </div>
                  <div className="max-w-md mx-auto aspect-video bg-black rounded-lg overflow-hidden relative mb-3">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    {webcamTarget === 'FACE' && (
                      <div className="absolute inset-0 border-2 border-dashed border-blue-400/60 rounded-full m-8 pointer-events-none flex items-center justify-center">
                        <span className="text-[10px] text-blue-300 bg-slate-950/80 px-2 py-0.5 rounded">
                          Center face within oval
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center space-x-3">
                    <button
                      type="button"
                      onClick={stopWebcam}
                      className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Cancel Camera
                    </button>
                    <button
                      type="button"
                      onClick={captureWebcamSnapshot}
                      className="px-5 py-1.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Capture Photo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Side-by-Side: Photo of Valid ID and Face Photo */}
              <div className="grid grid-cols-2 gap-6">
                
                {/* 1. Photo of Valid ID */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-blue-400" />
                      <span>Photo of Valid ID <span className="text-blue-400">*</span></span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Front side clear</span>
                  </div>
                  <div className="aspect-[16/10] bg-slate-900 border border-slate-700 rounded-lg overflow-hidden relative flex items-center justify-center mb-3 group">
                    {idPhotoUrl ? (
                      <img
                        src={idPhotoUrl}
                        alt="Valid ID Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4 text-slate-500 text-xs">
                        <CreditCard className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <span>No ID photo uploaded</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center space-x-2 transition-opacity">
                      <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded flex items-center space-x-1">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'ID')}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => startWebcam('ID')}
                        className="bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-semibold px-3 py-1.5 rounded flex items-center space-x-1 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Webcam</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <label className="cursor-pointer text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>Choose ID Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'ID')}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => startWebcam('ID')}
                      className="text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Take Photo</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Must clearly show your name, photo, birthdate, and ID number without glare.
                  </p>
                </div>

                {/* 2. Photo of Face to confirm identity */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-blue-400" />
                      <span>Photo of Face (Confirm Identity) <span className="text-blue-400">*</span></span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Facial match check</span>
                  </div>
                  <div className="aspect-[16/10] bg-slate-900 border border-slate-700 rounded-lg overflow-hidden relative flex items-center justify-center mb-3 group">
                    {facePhotoUrl ? (
                      <img
                        src={facePhotoUrl}
                        alt="Face Photo Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4 text-slate-500 text-xs">
                        <User className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <span>No face photo uploaded</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center space-x-2 transition-opacity">
                      <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded flex items-center space-x-1">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Selfie</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'FACE')}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => startWebcam('FACE')}
                        className="bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-semibold px-3 py-1.5 rounded flex items-center space-x-1 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Take Selfie</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <label className="cursor-pointer text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>Upload Selfie Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'FACE')}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => startWebcam('FACE')}
                      className="text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Take Selfie</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Neutral facial expression, plain background, no hats or dark glasses.
                  </p>
                </div>

              </div>

              {/* Consent & Affirmation */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-400"
                  />
                  <div className="text-xs text-slate-300 leading-relaxed">
                    <strong className="text-slate-100 block mb-0.5">
                      Visitor Clearance & In-Person Biometric Undertaking
                    </strong>
                    I hereby certify under oath that all information submitted is true, correct, and matches my genuine government-issued identification. I understand that <strong className="text-blue-300">after email confirmation, I must visit the BJMP Jail Facility in person to have my biometric fingerprint scanned</strong> to complete the identity activation process before any visitation pass will be issued.
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-2.5 text-xs text-slate-400 hover:text-slate-200 font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Personal Details</span>
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-7 py-3 rounded-lg text-xs flex items-center space-x-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <span>Submit Registration & Proceed to Email Confirmation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
