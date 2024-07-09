//not just code for button itself, but for the model that opens up when you click the files 
//client component allows for more interactivity.

'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from './ui/dialog'
import { Button } from './ui/button'

//dropzone is imported as a default, not as a type. in object syntax so not destructuring
import Dropzone from "react-dropzone"
import { Cloud, File, Loader2 } from 'lucide-react'
import { Progress } from './ui/progress'
import { useUploadThing } from '@/lib/uploadthing'
import { useToast } from './ui/use-toast'
import { trpc } from '@/app/_trpc/client'
import { useRouter } from 'next/navigation'

const UploadDropzone = ({
  isSubscribed,
}: {
  isSubscribed: boolean
}) => {
  const router = useRouter()

  //show loading progress of pdf uploading. 
  //useState<boolean> can also be <boolean | null> if there are multiple allowed states. 
  const [isUploading, setIsUploading] =
    useState<boolean>(false)

  //state for upload progress, and tells ts that its only ever a number type. 
  const [uploadProgress, setUploadProgress] =
    useState<number>(0)
  const { toast } = useToast()

  const { startUpload } = useUploadThing(
    isSubscribed ? 'proPlanUploader' : 'freePlanUploader'
  )

  //with trpc polling, retry and continuously poll after every time interval. 
  //without {mutate:StartPolling}, nothign will trigger this action so need to include. 
  //startPolling begins at the very end of the onDrop function/event. 
  const { mutate: startPolling } = trpc.getFile.useMutation(
    {
      onSuccess: (file) => {
        router.push(`/dashboard/${file.id}`)
      },
      retry: true,
      retryDelay: 500,
    }
  )

  const startSimulatedProgress = () => {
    setUploadProgress(0)

    const interval = setInterval(() => {
      setUploadProgress((prevProgress) => {
        if (prevProgress >= 95) {
          clearInterval(interval)
          return prevProgress
        }
        return prevProgress + 5
      })
    }, 500)

    return interval
  }

  //have multiple = false because you only want to upload a single pdf at a time.
  return (
    <Dropzone
      multiple={false}
      onDrop={async (acceptedFile) => {
        setIsUploading(true)

        const progressInterval = startSimulatedProgress()

        //to test file upload progress speed: await new Promise((resolve)=>setTimeout(resolve,3000));
        
        // handle file uploading
        const res = await startUpload(acceptedFile)

        if (!res) {
          return toast({
            title: 'Something went wrong',
            description: 'Please try again later',
            variant: 'destructive',
          })
        }

        const [fileResponse] = res

        const key = fileResponse?.key

          //key is essential to see if image is uploaded successfully.
        if (!key) {
          return toast({
            title: 'Something went wrong',
            description: 'Please try again later',
            variant: 'destructive',
          })
        }

        clearInterval(progressInterval)
        setUploadProgress(100)

        //need to to polling to make sure that after we "uploaded", that it is actually inside the database. 
        //polling is where our app (yb) sends request to api every (*) seconds, and our api gives a response back after check db
        startPolling({ key })
      }}>
      {({ getRootProps, getInputProps, acceptedFiles }) => (
        <div
          {...getRootProps()}
          className='border h-64 m-4 border-dashed border-gray-300 rounded-lg'>
          <div className='flex items-center justify-center h-full w-full'>
            <label
              htmlFor='dropzone-file'
              className='flex flex-col items-center justify-center w-full h-full rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100'>
              <div className='flex flex-col items-center justify-center pt-5 pb-6'>
                <Cloud className='h-6 w-6 text-zinc-500 mb-2' />
                <p className='mb-2 text-sm text-zinc-700'>
                  <span className='font-semibold'>
                    Click to upload
                  </span>{' '}
                  or drag and drop
                </p>
                <p className='text-xs text-zinc-500'>
                  PDF (up to {isSubscribed ? "16" : "4"}MB)
                </p>
              </div>

              {acceptedFiles && acceptedFiles[0] ? (
                <div className='max-w-xs bg-white flex items-center rounded-md overflow-hidden outline outline-[1px] outline-zinc-200 divide-x divide-zinc-200'>
                  <div className='px-3 py-2 h-full grid place-items-center'>
                    <File className='h-4 w-4 text-blue-500' />
                  </div>
                  <div className='px-3 py-2 h-full text-sm truncate'>
                    {acceptedFiles[0].name}
                  </div>
                </div>
              ) : null}

              {isUploading ? (
                <div className='w-full mt-4 max-w-xs mx-auto'>
                  <Progress
                    indicatorColor={
                      uploadProgress === 100
                        ? 'bg-green-500'
                        : ''
                    }
                    value={uploadProgress}
                    className='h-1 w-full bg-zinc-200'
                  />
                  {uploadProgress === 100 ? (
                    <div className='flex gap-1 items-center justify-center text-sm text-zinc-700 text-center pt-2'>
                      <Loader2 className='h-3 w-3 animate-spin' />
                      Redirecting...
                    </div>
                  ) : null}
                </div>
              ) : null}

              <input
                {...getInputProps()}
                type='file'
                id='dropzone-file'
                className='hidden'
              />
            </label>
          </div>
        </div>
      )}
    </Dropzone>
  )
}

const UploadButton = ({
  isSubscribed,
}: {
  isSubscribed: boolean
}) => {

    //set a state that other componenets use(open, closed states)
  const [isOpen, setIsOpen] = useState<boolean>(false)

  //use shadcn dialog component, and can manage states such as when it is open. 
  //add a callback function to this controlled component, 
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) {
          setIsOpen(v)
        }
      }}>
      <DialogTrigger
        onClick={() => setIsOpen(true)}
        asChild>
        <Button>Upload PDF</Button>
      </DialogTrigger>

      <DialogContent>
        <UploadDropzone isSubscribed={isSubscribed} />
      </DialogContent>
    </Dialog>
  )
}

export default UploadButton