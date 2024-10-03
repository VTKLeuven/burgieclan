import HomePage from '@/components/homepage'
import React from 'react'
import { Announcement } from '@/types';

const announcements: Announcement[] = [
    {
        title: 'New Course Available',
        description: 'A new course has been added.',
        startDate: new Date('2024-29-09'),
        endDate: new Date('2024-10-10'),
        color: 'blue',
        url: 'https://example.com/course'
    },
    {
        title: 'Test',
        description: 'Dit is een test',
        startDate: new Date('2024-10-01'),
        endDate: new Date('2024-11-20'),
        color: 'blue',
        url: 'https://example.com/course'
    }
];

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
                    announcements={announcements}
                    bottomLeft={<div className="pl-5 pt-5">
                                <h3>Pick up where you left off</h3>
                            </div>}
                    bottomRight={<div className="flex items-center justify-center h-full">
                                <h3>Drag & drop bestanden</h3>
                              </div>}
                  />
              </div>
          </div>
      </>
  );
}
