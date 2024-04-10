/**
 * @jest-environment jsdom
 */

import { screen, fireEvent, waitFor } from "@testing-library/dom"
import NewBillUI from "../views/NewBillUI.js"
import BillsUI from "../views/BillsUI.js"
import NewBill from "../containers/NewBill.js"
import { localStorageMock } from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store.js"
import { ROUTES } from "../constants/routes.js"

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock})
  window.localStorage.setItem('user', JSON.stringify({
    type: 'Employee',
    email: 'employee@test.tld',
    password: 'employee',
    status: 'connected'
  }))
  document.body.innerHTML = NewBillUI()
})
describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then I upload a file with a bad extension", () => {
      // Mock de windows alert (non implémenté de base)
      const jsdomAlert = window.alert
      window.alert = () => {}
      //---------------
      const fileInput = screen.getByTestId('file')
      const onNavigate = jest.fn()
      const newBill = new NewBill({
        document, onNavigate, store: mockStore, localStorage: localStorageMock
      })
      const handleChangeFile = jest.fn(newBill.handleChangeFile)
      fileInput.addEventListener('change', handleChangeFile)
      const fileWithBadMimeType = new File(['bill-test.pdf'], 'bill-test.pdf', { type: "application/pdf" })
      fireEvent.change(fileInput, { target: { files: [fileWithBadMimeType]}})
      jest.spyOn(window, 'alert').mockImplementation(() => {
        expect(jsdomAlert).toHaveBeenCalledWith('Mauvais type de fichier')
        expect(fileInput).toBeEmpty()
      })
    })
    test("Then I upload a file with a good extension", () => {
      const onNavigate = jest.fn()
      const newBill = new NewBill({
        document, onNavigate, store: mockStore, localStorage: localStorageMock
      })
      const fileInput = screen.getByTestId('file')
      const handleChangeFile = jest.fn(newBill.handleChangeFile)
      const fileWithCorrectExtension = new File(['bill-test.png'], 'bill-test.png', {type: 'image/png'})
      fileInput.addEventListener('change',(e) => {
        handleChangeFile(e).then((billObj) => {
          //console.log(billObj)
          waitFor(() => {
            expect(billObj.billID).toBe('1234')
          })
          waitFor(() => {
            expect(billObj.fileUrl).toBe('https://localhost:3456/images/test.jpg')
          })
          waitFor(() => {
            expect(billObj.fileName).toBe('bill-test.png')
          })
        })
      })
      //userEvent.upload(file, 'bill-test.png')
      fireEvent.change(fileInput, {target: {files: [fileWithCorrectExtension]}})
      expect(handleChangeFile).toHaveBeenCalledTimes(1)
    })
  })
  describe("When I want to submit the form", () => {
    test("Then I submit the form with all complete fields", async () => {
      // Modification du localStorage pour avoir un email qui correspond au mock
      window.localStorage.setItem('user', JSON.stringify({
        email:"a@a"
      }))
      const email = JSON.parse(window.localStorage.getItem('user')).email
      // Selection des champs
      const form = screen.getByTestId('form-new-bill')
      const typeSelect = screen.getByTestId('expense-type')
      const nameInput = screen.getByTestId('expense-name')
      const dateInput = screen.getByTestId('datepicker')
      const amountInput = screen.getByTestId('amount')
      const vatInput = screen.getByTestId('vat')
      const pctInput = screen.getByTestId('pct')
      const commentaryInput = screen.getByTestId('commentary')
      const fileInput = screen.getByTestId('file')
      // Remplissage des champs
      typeSelect.value = "Hôtel et logement"
      nameInput.value = "encore"
      dateInput.value = "2004-04-04"
      amountInput.value = 400
      vatInput.value = "80"
      pctInput.value = 20
      commentaryInput.value = "séminaire billed"
      const onNavigate = pathname => {
        document.body.innerHTML = ROUTES({pathname})
      }
      const newBill = new NewBill({
        document, onNavigate, store: mockStore, localStorage: localStorageMock
      })
      const handleChangeFile = jest.fn(newBill.handleChangeFile)
      fileInput.addEventListener('change', handleChangeFile)
      const file = new File(['preview-facture-free-201801-pdf-1.jpg'],"preview-facture-free-201801-pdf-1.jpg", {type: "image/jpg"})
      //userEvent.upload(file, 'bill-test.png')
      fireEvent.change(fileInput, {target: {files: [file]}})
      // création du formData
      const formData = new FormData()
      formData.append('email', email)
      formData.append('type', typeSelect.value)
      formData.append('name', nameInput.value)
      formData.append('date', dateInput.value)
      formData.append('amount', amountInput.value)
      formData.append('vat', vatInput.value)
      formData.append('pct', pctInput.value)
      formData.append('commentary', commentaryInput.value)
      formData.append('fileName',file.name)
      // gestion de l'event submit
      const handleSubmit = jest.fn(newBill.handleSubmit)
      form.addEventListener('submit',handleSubmit)
      fireEvent.submit(form, {target: formData})
      // on s'assure que la fonction handleSubmit à bien été appelée
      expect(handleSubmit).toHaveBeenCalledTimes(1)
      // on vérifie que l'on est bien redirigé vers la page Bills
      const newBillButton = await screen.getByTestId('btn-new-bill')
      expect(newBillButton).toBeTruthy()
    })
    test("Then a new bill should be created", async () => {
      //mock des fonctions du store
      const createFnMock = jest.fn(() => mockStore.bills().create())
      const updateFnMock = jest.fn(() => mockStore.bills().update())
      // test de la fonction mocké create()
      const resultForCreate = await createFnMock()
      expect(createFnMock).toHaveBeenCalledTimes(1)
      expect(resultForCreate.fileUrl).toBe('https://localhost:3456/images/test.jpg')
      expect(resultForCreate.key).toBe('1234')
      //test de la fonction mocké update()
      const resultForUpdate = await updateFnMock()
      expect(updateFnMock).toHaveBeenCalledTimes(1)
      expect(resultForUpdate).toEqual({
        id: "47qAXb6fIm2zOKkLzMro",
        vat: "80",
        fileUrl: "https://firebasestorage.googleapis.com/v0/b/billable-677b6.a…f-1.jpg?alt=media&token=c1640e12-a24b-4b11-ae52-529112e9602a",
        status: "pending",
        type: "Hôtel et logement",
        commentary: "séminaire billed",
        name: "encore",
        fileName: "preview-facture-free-201801-pdf-1.jpg",
        date: "2004-04-04",
        amount: 400,
        commentAdmin: "ok",
        email: "a@a",
        pct: 20
      })
    })
  })
  describe("When an error occurs on API", () => {
    beforeEach(() => { 
      Object.defineProperty(window, 'localStorage', { value: localStorageMock})
			//document.body.innerHTML = NewBillUI()
    })
    test("Then fetches bills from an API and fails with 404 message error when we are redirected on Bills page", async () => {
      const html = BillsUI({ error: 'Erreur 404' })
      document.body.innerHTML = html
      const message = await screen.getByText(/Erreur 404/)
      expect(message).toBeTruthy()
    })

    test("Then fetches messages from an API and fails with 500 message error when we are redirected on Bills page", async () => {
      const html = BillsUI({ error: 'Erreur 500' })
      document.body.innerHTML = html
      const message = await screen.getByText(/Erreur 500/)
      expect(message).toBeTruthy()
    })
  })
})

