import HomePage from '@/components/homepage'
import React from 'react'


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
                  <HomePage
                    topLeft={<div className="pl-5 pt-5">
                                <h3>Pick up where you left off</h3>
                            </div>}
                    topRight={<div className="flex items-center justify-center h-full">
                                <h3>Drag & drop bestanden</h3>
                              </div>}
                    bottomLeft={<div className="pt-5">
                                    <h3>Nieuws</h3>
                                </div>}
                    bottomRight={<div className="pt-5">
                                    <h3>Snel navigeren naar</h3>
                                </div>}
                  />
              </div>
          </div>
      </>
  );
}
