/**
 * @jest-environment jsdom
 */

import {screen, waitFor, fireEvent} from "@testing-library/dom"
import userEvent from "@testing-library/user-event"
import BillsUI from "../views/BillsUI.js"
import Bills from "../containers/Bills.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES, ROUTES_PATH} from "../constants/routes.js"
import {localStorageMock} from "../__mocks__/localStorage.js"
import mockedStore from "../__mocks__/store.js"

import router from "../app/Router.js"
import '@testing-library/jest-dom' // for toHaveClass and other implementation

jest.mock("../app/Store", () => mockedStore)

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      expect(windowIcon).toHaveClass('active-icon')
    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })
    test("Then i click on NewBill button I should be redirected on NewBill page", () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const onNavigate = pathname => {
        document.body.innerHTML = ROUTES({pathname})
      }
      const bill = new Bills({
        document,
        onNavigate,
        store: mockedStore,
        localStorage: window.localStorage
      })
      document.body.innerHTML = BillsUI({data: bills})
      const newBillButton = screen.getByTestId('btn-new-bill')
      expect(newBillButton).toBeTruthy()
      const handleClickNewBill = jest.fn(bill.handleClickNewBill)
      newBillButton.addEventListener('click', handleClickNewBill)
      userEvent.click(newBillButton)
      expect(handleClickNewBill).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Envoyer une note de frais')).toBeInTheDocument()
    })
    test("Then I click on the icon eye, a modal should open", () => {
      const bill = new Bills({
        document,
        onNavigate,
        firestore: null,
        localStorage: window.localStorage
      })
      document.body.innerHTML = BillsUI({data: bills})
      const globalEyeIcon = screen.getAllByTestId('icon-eye')
      const eyeIcon = screen.getAllByTestId('icon-eye')[0]
      const handleClickIconEye = jest.fn(bill.handleClickIconEye)
      const modalMock = screen.getByTestId('modaleFile')
      $.fn.modal = jest.fn().mockImplementationOnce(() => modalMock.classList.add('show'))
      if(globalEyeIcon) globalEyeIcon.forEach(currentEyeIcon => {
        currentEyeIcon.addEventListener('click', () => {
          handleClickIconEye(currentEyeIcon)
          expect(handleClickIconEye).toHaveBeenCalledTimes(1)
        })
      })
      userEvent.click(eyeIcon)
      expect(modalMock).toHaveClass('modal fade show')
      
    })
  })
  describe("When I navigate to Bills", () => {
    test("Then bills should be fetch correctly from mock API GET", async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const onNavigate = pathname => {
        document.body.innerHTML = ROUTES({pathname})
      }
      const newBills = new Bills({
        document,
        onNavigate,
        store: mockedStore,
        localStorage: window.localStorage
      })
      const billsList = newBills.store.bills().list()
      //console.log(billsList)
      expect(billsList).resolves.toEqual(bills)
    })
  })
  describe("When an error coccurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockedStore, "bills")
      Object.defineProperty(window, 'localStorage', { value: localStorageMock})
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
        email: 'employee@test.tld',
        password: 'employee',
        status: 'connected'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
    })
    test("fetches bills from an API and fails with 404 message error", async () => {

      mockedStore.bills.mockImplementationOnce(() => {
        return {
          list : () =>  {
            return Promise.reject(new Error("Erreur 404"))
          }
        }})
      window.onNavigate(ROUTES_PATH.Bills)
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 404/)
      expect(message).toBeTruthy()
    })

    test("fetches messages from an API and fails with 500 message error", async () => {

      mockedStore.bills.mockImplementationOnce(() => {
        return {
          list : () =>  {
            return Promise.reject(new Error("Erreur 500"))
          }
        }})

      window.onNavigate(ROUTES_PATH.Bills)
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 500/)
      expect(message).toBeTruthy()
    })
  })
})


