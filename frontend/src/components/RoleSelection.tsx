import React from 'react';

export enum InterviewRole {
  HR = "HR",
  TECHNICAL_MANAGER = "TECHNICAL_MANAGER",
}

interface RoleSelectionProps {
  selectedRole: InterviewRole;
  onRoleChange: (role: InterviewRole) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ selectedRole, onRoleChange }) => {
  return (
    <div className="role-selection">
      <h3>Select Interviewer Role</h3>
      <div>
        <label>
          <input
            type="radio"
            value={InterviewRole.HR}
            checked={selectedRole === InterviewRole.HR}
            onChange={() => onRoleChange(InterviewRole.HR)}
          />
          HR Interviewer
        </label>
      </div>
      <div>
        <label>
          <input
            type="radio"
            value={InterviewRole.TECHNICAL_MANAGER}
            checked={selectedRole === InterviewRole.TECHNICAL_MANAGER}
            onChange={() => onRoleChange(InterviewRole.TECHNICAL_MANAGER)}
          />
          Technical Manager
        </label>
      </div>
    </div>
  );
};

export default RoleSelection;
