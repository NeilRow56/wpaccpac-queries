import { ForgotPasswordForm } from './_components/forgot-password-form'

const ForgotPasswordPage = async () => {
  return (
    <div className='flex items-center justify-center'>
      <div className='flex flex-col'>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}

export default ForgotPasswordPage
