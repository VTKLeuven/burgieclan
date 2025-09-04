'use client';

import { useUser } from '@/components/UserContext';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function AnonymousSetting() {
    const { user, updateUserProperty } = useUser();
    const { request, loading, error } = useApi();
    const { showToast } = useToast();
    const { t } = useTranslation();

    const handleToggleAnonymous = async () => {
        if (!user) return;

        const newValue = !(user.defaultAnonymous);

        const result = await request('PATCH', `/api/users/${user.id}`, {
            defaultAnonymous: newValue
        });

        if (result) {
            // Update user property in context without full reload
            updateUserProperty('defaultAnonymous', newValue);

            showToast(
                t('account.anonymous_setting.update_success'),
                'success'
            );
        }
    };

    // Show error toast if API error occurs
    useEffect(() => {
        if (error) {
            showToast(
                t('account.anonymous_setting.update_error'),
                'error'
            );
        }
    }, [error, showToast, t]);

    return (
        <div className="mt-6 bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-medium text-wireframe-primary-blue">
                        {t('account.anonymous_setting.title')}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        {t('account.anonymous_setting.description')}
                    </p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                    <Switch
                        id="anonymous-mode"
                        checked={user?.defaultAnonymous}
                        onCheckedChange={handleToggleAnonymous}
                        disabled={loading}
                        aria-label={t('account.anonymous_setting.toggle_label')}
                    />
                    <Label htmlFor="anonymous-mode" className="whitespace-nowrap text-sm">
                        {user?.defaultAnonymous
                            ? t('account.anonymous_setting.enabled')
                            : t('account.anonymous_setting.disabled')}
                    </Label>
                </div>
            </div>
        </div>
    );
}
