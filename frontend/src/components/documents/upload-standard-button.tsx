import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, UploadCloud } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'

import { Button } from '@/components/ui/button'
import { documentQueryKeys } from '@/hooks/use-documents'
import { describeError } from '@/lib/api-client'
import { uploadDocument } from '@/lib/documents'

/**
 * Picks a PDF, uploads it, and refreshes every standards query on success.
 * Used from the workspace, the library, and empty states so behavior stays identical.
 */
export function UploadStandardButton({
  label = 'Upload Standard',
  variant = 'default',
  size = 'default',
}: {
  label?: string
  variant?: 'default' | 'outline'
  size?: 'default' | 'lg'
}) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const upload = useMutation({
    mutationFn: uploadDocument,
    onMutate: () => setError(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentQueryKeys.list })
    },
    onError: (err) => {
      setError(describeError(err, 'Upload failed. Please try again.'))
    },
  })

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      upload.mutate(file)
    }
    event.target.value = ''
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
        aria-label="Choose a PDF standard to upload"
      />
      <Button
        variant={variant}
        size={size}
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
      >
        {upload.isPending ? <Loader2 className="animate-spin" /> : <UploadCloud />}
        {upload.isPending ? 'Uploading…' : label}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
