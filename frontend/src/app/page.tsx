import HomePage from '@/components/homepage'


export default function App() {
  return (
      <>
          <div className="h-[8vh] bg-blue-900 flex items-center justify-center">
              <h1 className="text-white">Top Menu</h1>
          </div>

          <div className="flex h-[92vh]">
              <div className="w-[15vw] bg-blue-600">
                  <p>Dit is een menu balk</p>
              </div>

              <div className="w-[85vw]">
                  <HomePage/>
              </div>
          </div>
      </>
  );
}
