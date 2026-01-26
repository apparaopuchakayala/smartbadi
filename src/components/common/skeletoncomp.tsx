export const HubSkeleton = () => (
    <div className="lg:col-span-8 bg-white p-8 rounded-[44px] border border-slate-50 animate-pulse flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl"></div>
            <div className="space-y-3">
                <div className="h-6 w-32 bg-slate-100 rounded-lg"></div>
                <div className="h-3 w-48 bg-slate-50 rounded-lg"></div>
            </div>
        </div>
        <div className="text-right space-y-2">
            <div className="h-8 w-24 bg-slate-100 rounded-lg ml-auto"></div>
            <div className="h-3 w-32 bg-slate-50 rounded-lg ml-auto"></div>
        </div>
    </div>
);

export const CardSkeleton = () => (
    <div className="bg-white p-7 rounded-[40px] border border-slate-50 animate-pulse">
        <div className="flex justify-between mb-5">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
            <div className="h-5 w-12 bg-slate-50 rounded-lg"></div>
        </div>
        <div className="h-3 w-20 bg-slate-100 rounded-lg mb-2"></div>
        <div className="h-8 w-16 bg-slate-200 rounded-lg"></div>
    </div>
);