 import "./global.css" 

export const metadata = {
  title: "Paysofter AI",
  description: "The place to go for all your Softglobal questions!"
}

const RootLayout = ({ children }) => {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

export default RootLayout