import React, { useState, useEffect } from 'react';
import { TeacherDashboard } from './TeacherDashboard';
import { TeacherAttendance } from './TeacherAttendance';

export function TeacherPortal() {
    // 1. State Initializers (Checking Local Storage first)
    const [currentView, setCurrentView] = useState<'dashboard' | 'attendance'>(() => {
        return (localStorage.getItem('teacher_view') as 'dashboard' | 'attendance') || 'dashboard';
    });
    
    const [selectedClassData, setSelectedClassData] = useState<any>(() => {
        const saved = localStorage.getItem('selected_class');
        return saved ? JSON.parse(saved) : null;
    });

    // 2. Action: When Class is Selected
    const handleClassSelect = (cls: any) => {
        console.log("Saving Class:", cls); // Debugging
        
        // Update State
        setSelectedClassData(cls);
        setCurrentView('attendance');
        
        // Persist to Local Storage (so refresh works)
        localStorage.setItem('selected_class', JSON.stringify(cls));
        localStorage.setItem('teacher_view', 'attendance');
    };

    // 3. Action: Back Button
    const handleBack = () => {
        setSelectedClassData(null);
        setCurrentView('dashboard');
        
        // Clear Storage
        localStorage.removeItem('selected_class');
        localStorage.setItem('teacher_view', 'dashboard');
    };

    return (
        <div className="bg-slate-50 min-h-screen">
            {currentView === 'dashboard' ? (
                <TeacherDashboard onSelectClass={handleClassSelect} />
            ) : (
                <TeacherAttendance preSelectedClass={selectedClassData} onBack={handleBack} />
            )}
        </div>
    );
}