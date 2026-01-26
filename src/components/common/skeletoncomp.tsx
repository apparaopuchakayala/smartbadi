import React from 'react';

export const LoginFormSkeleton = () => (
    <div className="bg-white rounded-[40px] shadow-2xl p-10 w-full max-w-md border border-gray-100 animate-pulse">
        <div className="flex justify-center mb-6 mt-8">
            <div className="h-20 w-40 bg-slate-100 rounded-2xl"></div>
        </div>
        <div className="space-y-2 mb-10 flex flex-col items-center">
            <div className="h-6 w-32 bg-slate-200 rounded-lg"></div>
            <div className="h-4 w-48 bg-slate-50 rounded-full mt-2"></div>
        </div>
        <div className="space-y-6">
            <div className="space-y-2">
                <div className="h-3 w-20 bg-slate-100 rounded ml-4"></div>
                <div className="h-14 w-full bg-slate-50 rounded-2xl"></div>
            </div>
            <div className="space-y-2">
                <div className="h-3 w-20 bg-slate-100 rounded ml-4"></div>
                <div className="h-14 w-full bg-slate-50 rounded-2xl"></div>
            </div>
            <div className="h-14 w-full bg-slate-200 rounded-2xl mt-8"></div>
        </div>
    </div>
);

export const SchoolItemSkeleton = () => (
    <div className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-transparent bg-gray-50 animate-pulse">
        <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gray-200 w-11 h-11"></div>
            <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded-md"></div>
                <div className="h-3 w-20 bg-gray-100 rounded-md"></div>
            </div>
        </div>
    </div>
);

export const HubSkeleton = () => (
    <div className="lg:col-span-8 bg-white p-8 rounded-[44px] border border-slate-100 animate-pulse flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
        <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-slate-200 rounded-3xl"></div>
            <div className="space-y-3">
                <div className="h-6 w-40 bg-slate-200 rounded-lg"></div>
                <div className="h-3 w-56 bg-slate-100 rounded-lg"></div>
            </div>
        </div>
        <div className="text-right space-y-2 hidden md:block">
            <div className="h-8 w-24 bg-slate-200 rounded-lg ml-auto"></div>
            <div className="h-3 w-32 bg-slate-100 rounded-lg ml-auto"></div>
        </div>
    </div>
);

export const CardSkeleton = () => (
    <div className="bg-white p-7 rounded-[40px] border-2 border-slate-100 animate-pulse shadow-sm">
        <div className="flex justify-between mb-5">
            <div className="w-14 h-14 bg-slate-200 rounded-2xl"></div>
            <div className="h-6 w-16 bg-slate-100 rounded-full"></div>
        </div>
        <div className="h-3 w-24 bg-slate-100 rounded-lg mb-3"></div>
        <div className="h-10 w-20 bg-slate-200 rounded-xl"></div>
        <div className="mt-6 pt-4 border-t border-slate-50">
             <div className="h-8 w-full bg-slate-50 rounded-xl"></div>
        </div>
    </div>
);

// High Visibility Table Skeleton for Student List / Marks Entry
export const TableSkeleton = () => (
    <div className="w-full bg-white rounded-[40px] border-2 border-slate-100 overflow-hidden animate-pulse">
        {/* Table Header */}
        <div className="bg-slate-900 h-20 w-full mb-2"></div>
        {/* Table Rows */}
        {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center justify-between px-8 py-6 border-b border-slate-50">
                <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-slate-200 rounded-2xl shrink-0"></div>
                    <div className="space-y-2 w-full">
                        <div className="h-4 bg-slate-200 rounded-full w-40"></div>
                        <div className="h-3 bg-slate-100 rounded-full w-24"></div>
                    </div>
                </div>
                <div className="h-10 bg-slate-100 rounded-xl w-32 hidden md:block"></div>
                <div className="h-10 bg-slate-200 rounded-xl w-24 ml-8"></div>
            </div>
        ))}
    </div>
);

// Search Bar Skeleton
export const ControlSkeleton = () => (
    <div className="w-full bg-white p-6 rounded-[35px] border-2 border-slate-100 animate-pulse flex flex-col md:flex-row gap-4">
        <div className="flex-1 h-14 bg-slate-100 rounded-2xl"></div>
        <div className="h-14 w-full md:w-40 bg-slate-200 rounded-2xl"></div>
    </div>
);