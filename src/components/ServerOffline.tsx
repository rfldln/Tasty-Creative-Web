import { AlertCircle } from "lucide-react";
import React from "react";

const ServerOffline = () => {
  const handleTryAgain = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col gap-4 shadow-md w-full p-6 bg-black/20 rounded-lg border border-white/10">
      <div className="flex items-center gap-3">
        <AlertCircle className="text-red-500" size={24} />
        <h2 className="text-lg font-semibold text-red-500">
          Server is offline
        </h2>
      </div>
      <p className="text-gray-300">
        We&apos;re currently experiencing server connectivity issues. Our team
        has been notified and is working to resolve the problem.
      </p>
      <p className="text-gray-300">
        For the meantime, you can submit a request to discord about your flyer request.
      </p>
      <div className="mt-2">
        <p className="text-gray-400 text-sm">
          Please contact admin at{" "}
          <span className="text-blue-400">txl.tasty@gmail.com</span> for more
          information.
        </p>
      </div>
      <button
        onClick={handleTryAgain}
        className="mt-2 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md self-start transition-colors duration-200"
      >
        Try Again
      </button>
    </div>
  );
};

export default ServerOffline;
