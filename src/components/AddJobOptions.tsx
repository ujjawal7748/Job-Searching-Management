type AddJobOptionsProps = {
  onClose: () => void
  onManualAdd: () => void
  onCsvUpload: () => void
  onScreenshotUpload: () => void
}

function AddJobOptions({
  onClose,
  onManualAdd,
  onCsvUpload,
  onScreenshotUpload,
}: AddJobOptionsProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white p-4 sm:p-6">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            Add Job
          </h2>

          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">

          <button
            onClick={onManualAdd}
            className="w-full p-4 rounded-lg border border-slate-300 text-left hover:bg-slate-100"
          >
            <div className="font-semibold text-slate-900">
              📝 Manual Add
            </div>
            <div className="text-sm text-slate-500">
              Enter job details manually
            </div>
          </button>

          <button
            onClick={onCsvUpload}
            className="w-full p-4 rounded-lg border border-slate-300 text-left hover:bg-slate-100"
          >
            <div className="font-semibold text-slate-900">
              📄 Upload CSV
            </div>
            <div className="text-sm text-slate-500">
              Add multiple jobs from a CSV file
            </div>
          </button>

          <button
            onClick={onScreenshotUpload}
            className="w-full p-4 rounded-lg border border-slate-300 text-left hover:bg-slate-100"
          >
            <div className="font-semibold text-slate-900">
              📸 Upload Screenshot
            </div>
            <div className="text-sm text-slate-500">
              Let AI extract job details from a screenshot
            </div>
          </button>

        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>

      </div>
    </div>
  )
}

export default AddJobOptions