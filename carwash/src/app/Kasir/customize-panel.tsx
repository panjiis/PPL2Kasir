'use client';

import { X } from 'lucide-react';
import { usePreferences } from '@/app/providers/preferences-context';
import { useState } from 'react';
import Image from 'next/image';

export function CustomizationPanel() {
  const {
    isCustomize,
    toggleCustomize,
    buttonPrefs,
    setButtonPref,
    colorOptions,
    productImages,
    setProductImage,
    getUserProfile,
    setUserProfile,
  } = usePreferences();

  const [activeTab, setActiveTab] = useState<
    'buttons' | 'products' | 'profile'
  >('buttons');
  const userProfile = getUserProfile();

  if (!isCustomize) return null;

  // Group button preferences by section
  const sections = {
    'Aside Pills': Object.keys(buttonPrefs).filter((k) =>
      k.startsWith('aside:pill:')
    ),
    'Aside Bills': Object.keys(buttonPrefs).filter((k) =>
      k.startsWith('aside:bill:')
    ),
    'Center Pills': Object.keys(buttonPrefs).filter((k) =>
      k.startsWith('center:pill:')
    ),
    'Center Tiles': Object.keys(buttonPrefs).filter((k) =>
      k.startsWith('center:tile:')
    ),
    Sidebar: Object.keys(buttonPrefs).filter((k) => k.startsWith('sidebar:')),
  };

  return (
    <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4'>
      <div className='bg-card border border-border rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-border'>
          <h2 className='text-xl font-rubik font-bold text-foreground'>
            Customization Settings
          </h2>
          <button
            onClick={toggleCustomize}
            className='h-8 w-8 rounded-md hover:bg-secondary flex items-center justify-center'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Tabs */}
        <div className='flex border-b border-border'>
          <button
            onClick={() => setActiveTab('buttons')}
            className={[
              'flex-1 px-4 py-3 text-sm font-medium',
              activeTab === 'buttons'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            Buttons & Labels
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={[
              'flex-1 px-4 py-3 text-sm font-medium',
              activeTab === 'products'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            Product Images
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={[
              'flex-1 px-4 py-3 text-sm font-medium',
              activeTab === 'profile'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            User Profile
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-4'>
          {activeTab === 'buttons' && (
            <div className='space-y-6'>
              {Object.entries(sections).map(
                ([sectionName, keys]) =>
                  keys.length > 0 && (
                    <div key={sectionName} className='space-y-3'>
                      <h3 className='font-rubik font-semibold text-foreground text-sm border-b border-border pb-2'>
                        {sectionName}
                      </h3>
                      {keys.map((key) => {
                        const pref = buttonPrefs[key];
                        const defaultLabel =
                          key.split(':').pop()?.replace(/-/g, ' ') || '';
                        return (
                          <div
                            key={key}
                            className='grid grid-cols-[1fr_auto] gap-3 items-center p-3 rounded-lg bg-secondary/50'
                          >
                            <div className='space-y-2'>
                              <label className='text-xs text-muted-foreground block'>
                                {key}
                              </label>
                              <input
                                type='text'
                                className='w-full rounded-md border border-border bg-card text-foreground text-sm px-3 py-2'
                                defaultValue={pref?.label || defaultLabel}
                                onBlur={(e) =>
                                  setButtonPref(key, {
                                    label: e.currentTarget.value,
                                  })
                                }
                                placeholder='Button label...'
                              />
                            </div>
                            <div className='flex flex-wrap gap-2 max-w-[200px]'>
                              {colorOptions.map((opt) => (
                                <button
                                  key={opt.key}
                                  onClick={() =>
                                    setButtonPref(key, { color: opt.key })
                                  }
                                  className={[
                                    'h-8 w-8 rounded border-2',
                                    opt.classes.bg,
                                    pref?.color === opt.key
                                      ? 'ring-2 ring-offset-2 ring-primary'
                                      : 'border-border',
                                  ].join(' ')}
                                  title={opt.key}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
              )}
            </div>
          )}

          {activeTab === 'products' && (
            <div className='space-y-3'>
              <p className='text-sm text-muted-foreground mb-4'>
                Customize product images by entering image URLs below. Leave
                blank to use defaults.
              </p>
              {Object.entries(productImages).map(([productId, imageUrl]) => (
                <div
                  key={productId}
                  className='flex items-center gap-3 p-3 rounded-lg bg-secondary/50'
                >
                  <Image
                    src={imageUrl || '/placeholder.svg?height=60&width=60'}
                    alt={productId}
                    width={64}
                    height={64}
                    className='h-16 w-16 rounded-md object-cover border border-border'
                  />
                  <div className='flex-1'>
                    <label className='text-xs text-muted-foreground block mb-1'>
                      {productId}
                    </label>
                    <input
                      type='text'
                      className='w-full rounded-md border border-border bg-card text-foreground text-sm px-3 py-2'
                      defaultValue={imageUrl}
                      onBlur={(e) =>
                        setProductImage(productId, e.currentTarget.value)
                      }
                      placeholder='https://example.com/image.jpg'
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className='space-y-4 max-w-md'>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-foreground'>
                  Profile Photo URL
                </label>
                <div className='flex items-center gap-3'>
                  <Image
                    src={
                      userProfile.photo || '/placeholder.svg?height=64&width=64'
                    }
                    alt={userProfile.name}
                    width={64}
                    height={64}
                    className='h-16 w-16 rounded-md object-cover border-2 border-border'
                  />
                  <input
                    type='text'
                    className='flex-1 rounded-md border border-border bg-card text-foreground text-sm px-3 py-2'
                    defaultValue={userProfile.photo}
                    onBlur={(e) =>
                      setUserProfile({
                        ...userProfile,
                        photo: e.currentTarget.value,
                      })
                    }
                    placeholder='https://example.com/photo.jpg'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-foreground'>
                  Name
                </label>
                <input
                  type='text'
                  className='w-full rounded-md border border-border bg-card text-foreground text-sm px-3 py-2'
                  defaultValue={userProfile.name}
                  onBlur={(e) =>
                    setUserProfile({
                      ...userProfile,
                      name: e.currentTarget.value,
                    })
                  }
                  placeholder='Your name...'
                />
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-foreground'>
                  Role
                </label>
                <input
                  type='text'
                  className='w-full rounded-md border border-border bg-card text-foreground text-sm px-3 py-2'
                  defaultValue={userProfile.role}
                  onBlur={(e) =>
                    setUserProfile({
                      ...userProfile,
                      role: e.currentTarget.value,
                    })
                  }
                  placeholder='Your role...'
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-3 p-4 border-t border-border'>
          <button
            onClick={toggleCustomize}
            className='px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90'
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
