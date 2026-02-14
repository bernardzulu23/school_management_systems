"use client";

import { useState } from 'react';

export default function SchoolRegistrationPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    // School Info
    name: '',
    subdomain: '',
    domain: '',
    email: '',
    phone: '',
    address: '',
    timezone: 'Africa/Lusaka',
    currency: 'ZMW',
    academicYear: '',
    
    // Admin Info
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create school');
      }

      setSuccess(
        `School created successfully! URL: https://${data.school.subdomain}.bluepeacktechnologies.com`
      );
      
      // Reset form
      setFormData({
        name: '',
        subdomain: '',
        domain: '',
        email: '',
        phone: '',
        address: '',
        timezone: 'Africa/Lusaka',
        currency: 'ZMW',
        academicYear: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-generate subdomain from school name
    if (name === 'name') {
      const subdomain = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, subdomain }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Register New School
          </h1>
          <p className="text-gray-600 mb-8">
            Create a new school instance with admin account
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* School Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                School Information
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Zambian High School"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subdomain *
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      name="subdomain"
                      value={formData.subdomain}
                      onChange={handleChange}
                      required
                      pattern="[a-z0-9-]+"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="zambian-high-school"
                    />
                    <span className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-gray-600">
                      .bluepeacktechnologies.com
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Lowercase letters, numbers, and hyphens only
                  </p>
                </div>

                <div className="col-span-2"> 
                   <label className="block text-sm font-medium text-gray-700 mb-2"> 
                     Custom Domain (Optional) 
                   </label> 
                   <input 
                     type="text" 
                     name="domain" 
                     value={formData.domain} 
                     onChange={handleChange} 
                     className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                     placeholder="e.g., school.example.com" 
                   /> 
                 </div> 
 
                 <div> 
                   <label className="block text-sm font-medium text-gray-700 mb-2"> 
                     School Email 
                   </label> 
                   <input 
                     type="email" 
                     name="email" 
                     value={formData.email} 
                     onChange={handleChange} 
                     className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                     placeholder="info@school.edu" 
                   /> 
                 </div> 
 
                 <div> 
                   <label className="block text-sm font-medium text-gray-700 mb-2"> 
                     Phone Number 
                   </label> 
                   <input 
                     type="tel" 
                     name="phone" 
                     value={formData.phone} 
                     onChange={handleChange} 
                     className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                     placeholder="+260 xxx xxx xxx" 
                   /> 
                 </div> 
 
                 <div className="col-span-2"> 
                   <label className="block text-sm font-medium text-gray-700 mb-2"> 
                     Address 
                   </label> 
                   <input 
                     type="text" 
                     name="address" 
                     value={formData.address} 
                     onChange={handleChange} 
                     className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                     placeholder="City, Country" 
                   /> 
                 </div> 
 
                 <div> 
                   <label className="block text-sm font-medium text-gray-700 mb-2"> 
                     Timezone 
                   </label> 
                   <select 
                     name="timezone" 
                     value={formData.timezone} 
                     onChange={handleChange} 
                     className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                   > 
                     <option value="Africa/Lusaka">Africa/Lusaka</option> 
                     <option value="Africa/Nairobi">Africa/Nairobi</option> 
                     <option value="Africa/Johannesburg">Africa/Johannesburg</option> 
                     <option value="Africa/Lagos">Africa/Lagos</option> 
                   </select> 
                 </div> 
 
                 <div> 
                   <label className="block text-sm font-medium text-gray-700 mb-2"> 
                     Currency 
                   </label> 
                   <select 
                     name="currency" 
                     value={formData.currency} 
                     onChange={handleChange} 
                     className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                   > 
                     <option value="ZMW">ZMW (Zambian Kwacha)</option> 
                     <option value="KES">KES (Kenyan Shilling)</option> 
                     <option value="ZAR">ZAR (South African Rand)</option> 
                     <option value="USD">USD (US Dollar)</option> 
                   </select> 
                 </div>

                <div className="col-span-2"> 
                   <label className="block text-sm font-medium text-gray-700 mb-2"> 
                     Academic Year 
                   </label> 
                   <input 
                     type="text" 
                     name="academicYear" 
                     value={formData.academicYear} 
                     onChange={handleChange} 
                     className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                     placeholder="e.g., 2024/2025" 
                   /> 
                 </div> 
               </div> 
             </div> 
 
             {/* Admin Account */} 
             <div className="border-t pt-8"> 
               <h2 className="text-xl font-semibold text-gray-900 mb-4"> 
                 Administrator Account 
               </h2> 
               <div className="grid grid-cols-1 gap-6 sm:grid-cols-2"> 
                 <div className="col-span-2"> 
                   <label className="block text-sm font-medium text-gray-700 mb-2"> 
                     Admin Name * 
                   </label> 
                   <input 
                     type="text" 
                     name="adminName" 
                     value={formData.adminName} 
                     onChange={handleChange} 
                     required 
                     className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                     placeholder="Full Name" 
                   /> 
                 </div> 
 
                 <div className="col-span-2"> 
                   <label className="block text-sm font-medium text-gray-700 mb-2"> 
                     Admin Email * 
                   </label> 
                   <input 
                     type="email" 
                     name="adminEmail" 
                     value={formData.adminEmail} 
                     onChange={handleChange} 
                     required 
                     className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                     placeholder="admin@school.edu" 
                   /> 
                 </div> 
 
                 <div className="col-span-2"> 
                   <label className="block text-sm font-medium text-gray-700 mb-2"> 
                     Admin Password * 
                   </label> 
                   <input 
                     type="password" 
                     name="adminPassword" 
                     value={formData.adminPassword} 
                     onChange={handleChange} 
                     required 
                     minLength={8} 
                     className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                     placeholder="Min. 8 characters" 
                   /> 
                 </div> 
               </div> 
             </div> 
 
             {/* Submit Button */} 
             <div className="border-t pt-6"> 
               <button 
                 type="submit" 
                 disabled={loading} 
                 className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors" 
               > 
                 {loading ? 'Creating School...' : 'Create School'} 
               </button> 
             </div> 
           </form> 
         </div> 
       </div> 
     </div> 
   );
}
