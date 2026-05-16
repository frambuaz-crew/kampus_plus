import React, { createContext, useContext, useState } from 'react';

interface RegistrationData {
  email: string;
  university: string;
  university_id: string;
  first_name: string;
  last_name: string;
  faculty_id: string;
  department_id: string;
  terms_accepted: boolean;
}

const initialData: RegistrationData = {
  email: '',
  university: '',
  university_id: '',
  first_name: '',
  last_name: '',
  faculty_id: '',
  department_id: '',
  terms_accepted: false,
};

interface RegistrationContextType {
  regFormData: RegistrationData;
  setRegFormData: React.Dispatch<React.SetStateAction<RegistrationData>>;
  clearRegFormData: () => void;
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

export const RegistrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [regFormData, setRegFormData] = useState<RegistrationData>(initialData);

  const clearRegFormData = () => setRegFormData(initialData);

  return (
    <RegistrationContext.Provider value={{ regFormData, setRegFormData, clearRegFormData }}>
      {children}
    </RegistrationContext.Provider>
  );
};

export const useRegistration = () => {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistration must be used within a RegistrationProvider');
  }
  return context;
};
